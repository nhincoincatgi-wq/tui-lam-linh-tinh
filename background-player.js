(()=>{"use strict";
const chapters=window.NHI_STORIES||[];
const base="./audio/";
const KEY="benhvienkhongngu-background-player-v1";
let settings={last:"",positions:{},rate:1,autoNext:true};
try{const x=JSON.parse(localStorage.getItem(KEY)||"null");if(x&&typeof x==="object")settings={...settings,...x}}catch(e){}
const $=id=>document.getElementById(id);
const audio=new Audio();
audio.preload="metadata";
audio.setAttribute("playsinline","");
audio.id="backgroundAudio";
audio.style.display="none";
document.body.appendChild(audio);
let current="",lastSaved=0;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(settings))}catch(e){}}
function currentChapter(){return chapters.find(c=>c.id===current)}
function notify(message){
 const t=$("toast");
 if(t){t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),4200)}
}
function fmt(t){if(!Number.isFinite(t))return "0:00";const n=Math.floor(t);return Math.floor(n/60)+":"+String(n%60).padStart(2,"0")}
function setupMedia(){
 if(!("mediaSession"in navigator))return;
 const c=currentChapter();if(!c)return;
 try{
  navigator.mediaSession.metadata=new MediaMetadata({
   title:"Tập "+c.number+" — "+c.title,
   artist:"Bệnh viện không ngủ · Hệ thống thần y",
   album:"Nhi khoa Y6 · Truyện audio",
   artwork:[{src:new URL("./icon.svg",location.href).href,sizes:"192x192",type:"image/svg+xml"}]
  });
  const handlers={
   play:()=>audio.play().catch(()=>{}),
   pause:()=>audio.pause(),
   seekbackward:d=>seekBy(-(d.seekOffset||15)),
   seekforward:d=>seekBy(d.seekOffset||15),
   seekto:d=>{if(Number.isFinite(d.seekTime))audio.currentTime=d.seekTime},
   previoustrack:()=>track(-1),
   nexttrack:()=>track(1),
   stop:()=>audio.pause()
  };
  for(const [k,v]of Object.entries(handlers)){try{navigator.mediaSession.setActionHandler(k,v)}catch(e){}}
 }catch(e){}
}
function position(){
 if(!("mediaSession"in navigator)||!navigator.mediaSession.setPositionState)return;
 if(Number.isFinite(audio.duration)&&audio.duration>0){
  try{navigator.mediaSession.setPositionState({duration:audio.duration,position:audio.currentTime,playbackRate:audio.playbackRate})}catch(e){}
 }
}
function seekBy(seconds){if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,Math.max(0,audio.currentTime+seconds))}
function sync(){
 const box=$("bgPlayer");if(!box)return;
 $("bgTitle").textContent=currentChapter()?("Tập "+currentChapter().number+" · "+currentChapter().title):"Truyện audio";
 $("bgToggle").textContent=audio.paused?"▶":"Ⅱ";
 $("bgToggle").setAttribute("aria-label",audio.paused?"Phát":"Tạm dừng");
 $("bgTime").textContent=fmt(audio.currentTime)+" / "+fmt(audio.duration);
 const bar=$("bgSeek");if(bar&&!bar.matches(":active"))bar.value=Number.isFinite(audio.duration)&&audio.duration>0?Math.round(1000*audio.currentTime/audio.duration):0;
 if("mediaSession"in navigator)navigator.mediaSession.playbackState=audio.paused?"paused":"playing";
 position();
}
function showPlayer(){
 const box=$("bgPlayer");box.hidden=false;document.body.classList.add("has-bg-player");
 if($("bgAutoplay"))$("bgAutoplay").checked=settings.autoNext;
 if($("bgSpeed"))$("bgSpeed").value=String(settings.rate);
 sync();
}
async function start(id,autoplay=false){
 const c=chapters.find(x=>x.id===id);if(!c)return;
 if(current===id&&audio.src){
  if(audio.paused){await audio.play().catch(e=>notify("Không thể tiếp tục phát: "+e.message))}else if(!autoplay){audio.pause()}
  showPlayer();return;
 }
 // Only real media files provide reliable Android background playback.
 const url=base+encodeURIComponent(id)+".mp3";
 try{
  const r=await fetch(url,{method:"HEAD",cache:"no-store"});
  if(!r.ok)throw new Error("Audio chưa có trên máy chủ ("+r.status+")");
 }catch(e){
  notify("Chưa có bản MP3 của tập này. Có thể dùng Chrome ⋮ → Nghe trang này để nghe dưới nền.");
  return;
 }
 current=id;
 audio.pause();
 audio.src=url;
 audio.playbackRate=settings.rate;
 audio.load();
 settings.last=id;persist();
 setupMedia();
 showPlayer();
 const restore=Number(settings.positions[id]||0);
 if(restore>0){
  audio.addEventListener("loadedmetadata",function restorePos(){
   audio.removeEventListener("loadedmetadata",restorePos);
   if(restore<audio.duration-8)audio.currentTime=restore;
  });
 }
 try{await audio.play()}catch(e){notify("Nhấn ▶ trên thanh nghe để bắt đầu phát audio.")}
 sync();
}
function track(delta){
 const n=chapters.findIndex(c=>c.id===current);
 const next=chapters[n+delta];
 if(next)start(next.id,true);
}
function createPlayer(){
 const el=document.createElement("section");
 el.id="bgPlayer";el.className="bgplayer";el.hidden=true;el.setAttribute("aria-label","Trình phát audiobook dưới nền");
 el.innerHTML='<div class="bgplayer-main"><div class="bgplayer-info"><span class="bgplayer-label">🎧 ĐANG NGHE DƯỚI NỀN</span><strong id="bgTitle">Bệnh viện không ngủ</strong></div><div class="bgplayer-controls"><button id="bgPrev" title="Tập trước" aria-label="Tập trước">⏮</button><button id="bgBack" title="Lùi 15 giây" aria-label="Lùi 15 giây">↶15</button><button id="bgToggle" title="Phát hoặc tạm dừng">Ⅱ</button><button id="bgAhead" title="Tiến 15 giây" aria-label="Tiến 15 giây">15↷</button><button id="bgNext" title="Tập tiếp" aria-label="Tập tiếp">⏭</button></div><button id="bgClose" title="Đóng trình phát" aria-label="Dừng và đóng">×</button></div><div class="bgplayer-bottom"><span id="bgTime">0:00 / 0:00</span><input id="bgSeek" type="range" min="0" max="1000" value="0" aria-label="Tiến độ nghe"><label class="bgplayer-speed">Tốc độ <select id="bgSpeed"><option value=".8">0.8×</option><option value="1">1×</option><option value="1.2">1.2×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><label class="bgplayer-auto"><input id="bgAutoplay" type="checkbox"> Tự chuyển tập</label></div>';
 document.body.appendChild(el);
 $("bgPrev").onclick=()=>track(-1);
 $("bgNext").onclick=()=>track(1);
 $("bgBack").onclick=()=>seekBy(-15);
 $("bgAhead").onclick=()=>seekBy(15);
 $("bgToggle").onclick=()=>audio.paused?audio.play().catch(()=>notify("Không thể phát audio.")):audio.pause();
 $("bgClose").onclick=()=>{audio.pause();audio.removeAttribute("src");audio.load();current="";el.hidden=true;document.body.classList.remove("has-bg-player")};
 $("bgSeek").onchange=e=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Number(e.target.value)/1000*audio.duration};
 $("bgSpeed").onchange=e=>{settings.rate=Number(e.target.value);audio.playbackRate=settings.rate;persist();position()};
 $("bgAutoplay").onchange=e=>{settings.autoNext=e.target.checked;persist()};
}
function addReadControl(){
 const tools=document.querySelector(".readhead .tools");
 if(!tools||tools.querySelector(".listen-background"))return;
 const b=document.createElement("button");b.className="listen-background";b.type="button";
 b.textContent="🎧 Nghe dưới nền";b.title="Dùng file MP3 để nghe khi khóa màn hình hoặc chuyển ứng dụng";
 b.onclick=()=>{const match=decodeURIComponent(location.hash).match(/^#\/tap\/([^/]+)/);if(match)start(match[1])};
 const orig=$("listen");if(orig){orig.textContent="♬ Giọng máy";orig.title="Giọng đọc trực tiếp có thể ngừng khi khóa màn hình";orig.parentElement.insertBefore(b,orig)}
 else tools.prepend(b);
 const hint=document.createElement("div");hint.className="bg-hint";
 hint.textContent="🎧 Nghe dưới nền: phát MP3, điều khiển bằng màn hình khóa hoặc tai nghe. Giọng máy có thể dừng khi tắt màn hình.";
 tools.parentNode.appendChild(hint);
}
audio.addEventListener("play",sync);
audio.addEventListener("pause",sync);
audio.addEventListener("loadedmetadata",sync);
audio.addEventListener("timeupdate",()=>{
 sync();
 if(current&&Date.now()-lastSaved>2000){settings.positions[current]=audio.currentTime;persist();lastSaved=Date.now()}
});
audio.addEventListener("ratechange",sync);
audio.addEventListener("ended",()=>{
 if(current){settings.positions[current]=0;persist()}
 if(settings.autoNext){track(1)}else{sync();notify("Đã nghe xong tập này.")}
});
audio.addEventListener("error",()=>{if(current)notify("Không tải được MP3. Kiểm tra mạng rồi thử lại.")});
document.addEventListener("DOMContentLoaded",()=>{createPlayer();addReadControl()});
window.addEventListener("hashchange",()=>setTimeout(addReadControl,50));
})();