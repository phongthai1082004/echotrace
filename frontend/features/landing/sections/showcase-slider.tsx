"use client";

import { useState } from "react";

const SHOWCASE_IMGS = [
  { url:"https://images.unsplash.com/photo-1676883344224-2fa5de6025db?w=480&h=320&fit=crop&auto=format", alt:"Wedding photo book" },
  { url:"https://images.unsplash.com/photo-1646645733353-55c8bfb60a70?w=480&h=320&fit=crop&auto=format", alt:"Family memories" },
  { url:"https://images.unsplash.com/photo-1528569937393-ee892b976859?w=480&h=320&fit=crop&auto=format", alt:"B&W album" },
  { url:"https://images.unsplash.com/photo-1647541707168-82f7024cbc20?w=480&h=320&fit=crop&auto=format", alt:"Couple portrait" },
  { url:"https://images.unsplash.com/photo-1784722237779-7fd5be91c980?w=480&h=320&fit=crop&auto=format", alt:"Wedding album spreads" },
];

export function ShowcaseSlider() {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div style={{ position:"relative", height:260, overflow:"hidden", borderRadius:10, border:"2.5px solid #222", boxShadow:"5px 5px 0 #222", marginBottom:12 }}>
        {SHOWCASE_IMGS.map((img,i) => (
          <img key={i} src={img.url} alt={img.alt} style={{
            position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover",
            opacity: i===active ? 1 : 0, transition:"opacity .4s ease",
          }} />
        ))}
        <div style={{ position:"absolute", bottom:10, right:10, display:"flex", gap:5 }}>
          {SHOWCASE_IMGS.map((_,i) => (
            <button key={i} onClick={() => setActive(i)} style={{
              width: i===active ? 20 : 7, height:7,
              background: i===active ? "#F8F2E5" : "rgba(248,242,229,.45)",
              border:"1.5px solid #222", borderRadius:4, cursor:"pointer", padding:0,
              transition:"width .2s ease",
            }} />
          ))}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:7 }}>
        {SHOWCASE_IMGS.map((img,i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            padding:0, cursor:"pointer",
            border: i===active ? "2.5px solid #B54843" : "2px solid #222",
            borderRadius:6, overflow:"hidden", height:52,
            boxShadow: i===active ? "2px 2px 0 #B54843" : "2px 2px 0 #222",
            transition:"border-color .2s,box-shadow .2s",
          }}>
            <img src={img.url} alt={img.alt} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          </button>
        ))}
      </div>
    </div>
  );
}