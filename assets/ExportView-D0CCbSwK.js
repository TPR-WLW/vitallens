import{r as S,j as t}from"./index-CpQzWHIx.js";import{d as C}from"./index-DYd4jALD.js";import{stressStatus as R}from"./AdminDashboard-t71_KVRq.js";/* empty css                        */function q({session:f,teams:h}){const[l,g]=S.useState(()=>{const e=new Date;return e.setDate(e.getDate()-7),e.toISOString().split("T")[0]}),[x,c]=S.useState(()=>new Date().toISOString().split("T")[0]),[p,o]=S.useState(""),[v,r]=S.useState("mirucare-report"),[a,w]=S.useState(""),[d,y]=S.useState(!1),k=async()=>{y(!0);try{const e={from:l,to:x+"T23:59:59.999Z"};p&&(e.teamId=p);const b=await C.exportCSV(f.orgId,e);w(b)}catch{w("エラーが発生しました")}y(!1)};S.useEffect(()=>{k()},[l,x,p]);const i=()=>{const b=new Blob(["\uFEFF"+a],{type:"text/csv;charset=utf-8"}),$=URL.createObjectURL(b),N=document.createElement("a");N.href=$;const j=v.trim()||"mirucare-report";N.download=`${j}-${new Date().toISOString().split("T")[0]}.csv`,N.click(),URL.revokeObjectURL($)},m=e=>{const b=new Date,$=new Date;$.setDate($.getDate()-e),g($.toISOString().split("T")[0]),c(b.toISOString().split("T")[0])};return t.jsxs("div",{className:"adm-view",children:[t.jsx("h2",{className:"adm-view-title",children:"CSVデータ出力"}),t.jsx("p",{className:"adm-view-desc",children:"部署別ストレス・HRVデータをCSV形式でエクスポートします。RMSSD・SDNN・pNN50・LF/HF・呼吸数を含む全指標を出力します。稟議書や社内報告書への添付にご利用ください。"}),t.jsx("h3",{className:"adm-section-title",children:"期間選択"}),t.jsxs("div",{className:"adm-date-range",children:[t.jsxs("label",{children:["開始日:",t.jsx("input",{type:"date",value:l,onChange:e=>g(e.target.value)})]}),t.jsxs("label",{children:["終了日:",t.jsx("input",{type:"date",value:x,onChange:e=>c(e.target.value)})]})]}),t.jsxs("div",{className:"adm-quick-range",children:[t.jsx("button",{className:"adm-btn-ghost",onClick:()=>m(7),children:"直近1週間"}),t.jsx("button",{className:"adm-btn-ghost",onClick:()=>m(30),children:"直近1ヶ月"}),t.jsx("button",{className:"adm-btn-ghost",onClick:()=>m(365),children:"全期間"})]}),t.jsx("h3",{className:"adm-section-title",children:"部署フィルター"}),t.jsx("div",{className:"adm-export-field",children:t.jsxs("select",{className:"adm-export-select",value:p,onChange:e=>o(e.target.value),children:[t.jsx("option",{value:"",children:"全部署"}),h.map(e=>t.jsx("option",{value:e.id,children:e.name},e.id))]})}),t.jsxs("div",{className:"adm-export-privacy",children:[t.jsx("p",{children:"個人の計測データは含まれません"}),t.jsx("p",{children:"1日の計測者が5名未満の部署データは除外されます"})]}),t.jsx("button",{className:"adm-btn-primary",onClick:i,disabled:!a||d,children:"CSVをダウンロード"}),t.jsxs("div",{className:"adm-export-field",style:{marginTop:12},children:[t.jsx("label",{className:"adm-export-label",children:"ファイル名"}),t.jsxs("div",{className:"adm-export-filename",children:[t.jsx("input",{type:"text",className:"adm-export-input",value:v,onChange:e=>r(e.target.value),placeholder:"mirucare-report"}),t.jsxs("span",{className:"adm-export-suffix",children:["-",new Date().toISOString().split("T")[0],".csv"]})]})]}),a&&t.jsxs(t.Fragment,{children:[t.jsx("h3",{className:"adm-section-title",style:{marginTop:24},children:"プレビュー"}),t.jsx("pre",{className:"adm-csv-preview",children:a.split(`
`).slice(0,11).join(`
`)})]}),t.jsx("hr",{className:"adm-divider"}),t.jsx("h2",{className:"adm-view-title",style:{marginTop:24},children:"メンバー別CSV出力"}),t.jsx("p",{className:"adm-view-desc",children:"メンバー一覧と最終計測日をCSV形式でエクスポートします。計測未実施メンバーの把握にご利用ください。"}),t.jsx(H,{session:f}),t.jsx("hr",{className:"adm-divider"}),t.jsx("h2",{className:"adm-view-title",style:{marginTop:24},children:"組織レポート出力（PDF）"}),t.jsx("p",{className:"adm-view-desc",children:"期間比較・部署間ベンチマーク・チーム推移を含むA4レポートをPDFとして出力します。"}),t.jsx("button",{className:"adm-btn-primary",onClick:()=>V(f,h),children:"組織レポートをPDF出力"})]})}function H({session:f}){const[h,l]=S.useState(""),[g,x]=S.useState(!1);S.useEffect(()=>{(async()=>{x(!0);try{const p=await C.exportMemberCSV(f.orgId);l(p)}catch{l("エラーが発生しました")}x(!1)})()},[f.orgId]);const c=()=>{const o=new Blob(["\uFEFF"+h],{type:"text/csv;charset=utf-8"}),v=URL.createObjectURL(o),r=document.createElement("a");r.href=v,r.download=`mirucare-members-${new Date().toISOString().split("T")[0]}.csv`,r.click(),URL.revokeObjectURL(v)};return t.jsxs("div",{children:[t.jsx("button",{className:"adm-btn-primary",onClick:c,disabled:!h||g,children:"メンバーCSVをダウンロード"}),h&&t.jsxs(t.Fragment,{children:[t.jsx("h3",{className:"adm-section-title",style:{marginTop:16},children:"プレビュー"}),t.jsx("pre",{className:"adm-csv-preview",children:h.split(`
`).slice(0,11).join(`
`)})]})]})}function W(f,h){const p=f.length*34+20,o=100,v=f.map((a,w)=>{const d=w*34+10,y=Math.max(2,a.thisAvg/o*360),k=a.thisAvg>60?"#ef4444":a.thisAvg>40?"#f59e0b":"#22c55e";return`
      <text x="72" y="${d+28/2+4}" text-anchor="end" font-size="9" fill="#333">${a.name}</text>
      <rect x="80" y="${d}" width="${y}" height="28" rx="4" fill="${k}" opacity="0.85"/>
      <text x="${80+y+6}" y="${d+28/2+4}" font-size="9" font-weight="600" fill="#333">${a.thisAvg}</text>
    `}).join(""),r=80+h/o*360;return`<svg viewBox="0 0 500 ${p}" width="100%" preserveAspectRatio="xMidYMid meet" style="margin:8px 0 12px">
    ${v}
    <line x1="${r}" y1="4" x2="${r}" y2="${p-4}" stroke="#4f8cff" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="${r}" y="${p}" text-anchor="middle" font-size="7" fill="#4f8cff">平均 ${h}</text>
  </svg>`}function P(f,h,l){const g=f.filter(i=>i.lastAvg!=null||i.thisAvg!=null);if(g.length===0)return"";const x=80,c=28,p=180,o=20,v=40,r=30,a=r+g.length*x+20,w=100,d=p-o-v,y=g.map((i,m)=>{const e=r+m*x+(x-c*2-6)/2,b=i.lastAvg!=null?i.lastAvg/w*d:0,$=i.thisAvg!=null?i.thisAvg/w*d:0,N=o+d-b,j=o+d-$;return`
      ${i.lastAvg!=null?`<rect x="${e}" y="${N}" width="${c}" height="${b}" rx="3" fill="#94a3b8" opacity="0.7"/>
      <text x="${e+c/2}" y="${N-3}" text-anchor="middle" font-size="7" fill="#666">${i.lastAvg}</text>`:""}
      ${i.thisAvg!=null?`<rect x="${e+c+6}" y="${j}" width="${c}" height="${$}" rx="3" fill="#4f8cff" opacity="0.85"/>
      <text x="${e+c+6+c/2}" y="${j-3}" text-anchor="middle" font-size="7" fill="#4f8cff">${i.thisAvg}</text>`:""}
      <text x="${e+c+3}" y="${p-10}" text-anchor="middle" font-size="8" fill="#333">${i.name}</text>
    `}).join(""),k=[0,25,50,75].map(i=>{const m=o+d-i/w*d;return`<line x1="${r}" y1="${m}" x2="${a-10}" y2="${m}" stroke="#e5e7eb" stroke-width="0.5"/>
    <text x="${r-4}" y="${m+3}" text-anchor="end" font-size="7" fill="#999">${i}</text>`}).join("");return`<svg viewBox="0 0 ${a} ${p}" width="100%" preserveAspectRatio="xMidYMid meet" style="margin:8px 0 4px">
    ${k}
    <line x1="${r}" y1="${o}" x2="${r}" y2="${o+d}" stroke="#ccc" stroke-width="0.5"/>
    ${y}
    <rect x="${a-100}" y="2" width="10" height="10" rx="2" fill="#94a3b8" opacity="0.7"/>
    <text x="${a-86}" y="11" font-size="8" fill="#666">${h}</text>
    <rect x="${a-50}" y="2" width="10" height="10" rx="2" fill="#4f8cff" opacity="0.85"/>
    <text x="${a-36}" y="11" font-size="8" fill="#4f8cff">${l}</text>
  </svg>`}async function V(f,h){const l=new Date,g=new Date(l.getFullYear(),l.getMonth(),1),x=new Date(l.getFullYear(),l.getMonth()+1,0,23,59,59,999),c=new Date(l.getFullYear(),l.getMonth()-1,1),p=new Date(l.getFullYear(),l.getMonth(),0,23,59,59,999),o=`${g.getFullYear()}年${g.getMonth()+1}月`,v=`${c.getFullYear()}年${c.getMonth()+1}月`,r=`${l.getFullYear()}年${l.getMonth()+1}月${l.getDate()}日`,a=[];let w=0,d=0,y=0,k=0;for(const s of h){const n=await C.getTeamStats(s.id,{from:g.toISOString(),to:x.toISOString()}),u=await C.getTeamStats(s.id,{from:c.toISOString(),to:p.toISOString()}),z=n.stats&&!n.privacyFiltered?n.stats.avgStress:null,F=u.stats&&!u.privacyFiltered?u.stats.avgStress:null,T=n.stats?n.stats.measurementCount:0,L=u.stats?u.stats.measurementCount:0;z!=null&&(w+=z*T,d+=T),F!=null&&(y+=F*L,k+=L),a.push({name:s.name,thisAvg:z,lastAvg:F,thisCount:T,lastCount:L})}const i=d>0?Math.round(w/d):null,m=k>0?Math.round(y/k):null,e=i!=null&&m!=null?i-m:null,b=s=>{if(s==null)return'<span style="color:#9ca3af">---</span>';const n=R(s);return`<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:9pt;font-weight:600;color:#fff;background:${n.color}">${s} ${n.label}</span>`},$=s=>s==null?"#9ca3af":s<-3?"#22c55e":s>3?"#ef4444":"#9ca3af",N=s=>s==null?"":s<-3?"改善":s>3?"悪化":"横ばい",j=a.filter(s=>s.thisAvg!=null),A=[...j].sort((s,n)=>(s.thisAvg||0)-(n.thisAvg||0)),D=j.length>0?Math.round(j.reduce((s,n)=>s+n.thisAvg,0)/j.length):null,I=a.map(s=>{const n=s.thisAvg!=null&&s.lastAvg!=null?s.thisAvg-s.lastAvg:null;return`<tr>
      <td>${s.name}</td>
      <td>${b(s.lastAvg)}</td>
      <td>${b(s.thisAvg)}</td>
      <td style="color:${$(n)};font-weight:600">${n!=null?`${n>0?"+":""}${n}`:"---"} <small style="font-weight:400">${N(n)}</small></td>
    </tr>`}).join(""),O=A.map((s,n)=>{const u=D!=null?s.thisAvg-D:null;return`<tr>
      <td>${n+1}</td>
      <td>${s.name}</td>
      <td>${b(s.thisAvg)}</td>
      <td style="color:${$(u!=null&&u>5?10:u!=null&&u<-5?-10:0)}">${u!=null?`${u>0?"+":""}${u}`:"---"}</td>
    </tr>`}).join(""),E=`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>組織ストレスレポート — ミルケア</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif;
    color: #1a1a2e; font-size: 10.5pt; line-height: 1.6;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .report { max-width: 700px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; border-bottom: 3px solid #4f8cff; padding-bottom: 10px; margin-bottom: 18px; }
  .header-left h1 { font-size: 16pt; color: #4f8cff; }
  .header-left .subtitle { font-size: 8.5pt; color: #666; }
  .header-right { text-align: right; font-size: 9pt; color: #666; }
  .header-right .date { font-size: 11pt; color: #333; font-weight: 600; }
  .section { margin-bottom: 18px; break-inside: avoid; }
  .section-title { font-size: 12pt; font-weight: 700; color: #333; border-left: 4px solid #4f8cff; padding-left: 8px; margin-bottom: 10px; }
  .kpi-row { display: flex; gap: 12px; margin-bottom: 14px; }
  .kpi-card { flex: 1; background: #f8f9fc; border-radius: 8px; padding: 12px; text-align: center; }
  .kpi-value { font-size: 20pt; font-weight: 800; color: #333; }
  .kpi-label { font-size: 8.5pt; color: #888; margin-top: 2px; }
  .kpi-sub { font-size: 8pt; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th, td { padding: 7px 10px; border: 1px solid #e5e7eb; font-size: 9.5pt; text-align: center; }
  th { background: #f1f3f8; font-weight: 600; color: #444; }
  .disclaimer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 7.5pt; color: #999; }
  .footer { margin-top: 12px; text-align: center; font-size: 7.5pt; color: #bbb; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="report">
  <div class="header">
    <div class="header-left">
      <h1>組織ストレスレポート</h1>
      <div class="subtitle">ミルケア（MiruCare）— 非接触バイタルモニタリング</div>
    </div>
    <div class="header-right">
      <div class="date">${r}</div>
      <div>レポート出力日</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">期間比較（${v} → ${o}）</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-value">${m??"---"}</div>
        <div class="kpi-label">${v}</div>
        <div class="kpi-sub">${m!=null?R(m).label:"データなし"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${i??"---"}</div>
        <div class="kpi-label">${o}</div>
        <div class="kpi-sub">${i!=null?R(i).label:"データなし"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:${e!=null?e<0?"#22c55e":e>0?"#ef4444":"#333":"#999"}">${e!=null?`${e>0?"+":""}${e}`:"---"}</div>
        <div class="kpi-label">前月比</div>
        <div class="kpi-sub">${e!=null?e<0?"改善":e>0?"悪化":"変化なし":""}</div>
      </div>
    </div>

    <table>
      <thead><tr><th>部署</th><th>${v}</th><th>${o}</th><th>変化</th></tr></thead>
      <tbody>${I}</tbody>
    </table>
  </div>

  ${A.length>=2?`
  <div class="section">
    <div class="section-title">部署間ベンチマーク</div>
    ${W(A,D)}
    <table>
      <thead><tr><th>順位</th><th>部署</th><th>ストレススコア</th><th>組織平均との差</th></tr></thead>
      <tbody>${O}</tbody>
    </table>
    <p style="font-size:8pt;color:#888;margin-top:4px">※ 組織平均: ${D}（${A.length}部署の集計）</p>
  </div>
  `:""}

  ${a.length>=2&&a.some(s=>s.lastAvg!=null)&&a.some(s=>s.thisAvg!=null)?`
  <div class="section">
    <div class="section-title">部署別ストレス推移チャート</div>
    ${P(a,v,o)}
  </div>
  `:""}

  <div class="section">
    <div class="section-title">計測状況</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-value">${d}</div>
        <div class="kpi-label">${o} 計測数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${h.length}</div>
        <div class="kpi-label">部署数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${j.length}</div>
        <div class="kpi-label">集計可能部署</div>
      </div>
    </div>
  </div>

  <div class="disclaimer">
    <p>※ 本レポートはウェルネス参考値を提供するものであり、医療機器による診断結果ではありません。</p>
    <p>※ 個人の計測データは含まれません。1日の計測者が5名未満の部署データは除外されます。</p>
    <p>※ カメラ映像は処理後に即時破棄され、外部サーバーへの送信は行われません。</p>
  </div>
  <div class="footer">ミルケア（MiruCare）— 組織ストレスレポート | ${r}</div>
</div>

<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };<\/script>
</body>
</html>`,M=window.open("","_blank");if(!M){alert("ポップアップがブロックされています。ブラウザの設定でポップアップを許可してください。");return}M.document.write(E),M.document.close()}export{q as default};
