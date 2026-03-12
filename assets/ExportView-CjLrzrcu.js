import{r as g,j as t}from"./index-2UAf-SoA.js";import{d as C}from"./index-I6rq6qdM.js";import{stressStatus as L}from"./AdminDashboard-CNolKEzP.js";/* empty css                        */function J({session:u,teams:x}){const[i,h]=g.useState(()=>{const e=new Date;return e.setDate(e.getDate()-7),e.toISOString().split("T")[0]}),[f,d]=g.useState(()=>new Date().toISOString().split("T")[0]),[r,p]=g.useState(""),[v,l]=g.useState("mirucare-report"),[a,n]=g.useState(""),[c,j]=g.useState(!1),k=async()=>{j(!0);try{const e={from:i,to:f+"T23:59:59.999Z"};r&&(e.teamId=r);const y=await C.exportCSV(u.orgId,e);n(y)}catch{n("エラーが発生しました")}j(!1)};g.useEffect(()=>{k()},[i,f,r]);const o=()=>{const y=new Blob(["\uFEFF"+a],{type:"text/csv;charset=utf-8"}),w=URL.createObjectURL(y),N=document.createElement("a");N.href=w;const S=v.trim()||"mirucare-report";N.download=`${S}-${new Date().toISOString().split("T")[0]}.csv`,N.click(),URL.revokeObjectURL(w)},b=e=>{const y=new Date,w=new Date;w.setDate(w.getDate()-e),h(w.toISOString().split("T")[0]),d(y.toISOString().split("T")[0])};return t.jsxs("div",{className:"adm-view",children:[t.jsx("h2",{className:"adm-view-title",children:"CSVデータ出力"}),t.jsx("p",{className:"adm-view-desc",children:"部署別ストレス・HRVデータをCSV形式でエクスポートします。RMSSD・SDNN・pNN50・LF/HF・呼吸数を含む全指標を出力します。稟議書や社内報告書への添付にご利用ください。"}),t.jsx("h3",{className:"adm-section-title",children:"期間選択"}),t.jsxs("div",{className:"adm-date-range",children:[t.jsxs("label",{children:["開始日:",t.jsx("input",{type:"date",value:i,onChange:e=>h(e.target.value)})]}),t.jsxs("label",{children:["終了日:",t.jsx("input",{type:"date",value:f,onChange:e=>d(e.target.value)})]})]}),t.jsxs("div",{className:"adm-quick-range",children:[t.jsx("button",{className:"adm-btn-ghost",onClick:()=>b(7),children:"直近1週間"}),t.jsx("button",{className:"adm-btn-ghost",onClick:()=>b(30),children:"直近1ヶ月"}),t.jsx("button",{className:"adm-btn-ghost",onClick:()=>b(365),children:"全期間"})]}),t.jsx("h3",{className:"adm-section-title",children:"部署フィルター"}),t.jsx("div",{className:"adm-export-field",children:t.jsxs("select",{className:"adm-export-select",value:r,onChange:e=>p(e.target.value),children:[t.jsx("option",{value:"",children:"全部署"}),x.map(e=>t.jsx("option",{value:e.id,children:e.name},e.id))]})}),t.jsxs("div",{className:"adm-export-privacy",children:[t.jsx("p",{children:"個人の計測データは含まれません"}),t.jsx("p",{children:"1日の計測者が5名未満の部署データは除外されます"})]}),t.jsx("button",{className:"adm-btn-primary",onClick:o,disabled:!a||c,children:"CSVをダウンロード"}),t.jsxs("div",{className:"adm-export-field",style:{marginTop:12},children:[t.jsx("label",{className:"adm-export-label",children:"ファイル名"}),t.jsxs("div",{className:"adm-export-filename",children:[t.jsx("input",{type:"text",className:"adm-export-input",value:v,onChange:e=>l(e.target.value),placeholder:"mirucare-report"}),t.jsxs("span",{className:"adm-export-suffix",children:["-",new Date().toISOString().split("T")[0],".csv"]})]})]}),a&&t.jsxs(t.Fragment,{children:[t.jsx("h3",{className:"adm-section-title",style:{marginTop:24},children:"プレビュー"}),t.jsx("pre",{className:"adm-csv-preview",children:a.split(`
`).slice(0,11).join(`
`)})]}),t.jsx("hr",{className:"adm-divider"}),t.jsx("h2",{className:"adm-view-title",style:{marginTop:24},children:"メンバー別CSV出力"}),t.jsx("p",{className:"adm-view-desc",children:"メンバー一覧と最終計測日をCSV形式でエクスポートします。計測未実施メンバーの把握にご利用ください。"}),t.jsx(H,{session:u,teams:x}),t.jsx("hr",{className:"adm-divider"}),t.jsx("h2",{className:"adm-view-title",style:{marginTop:24},children:"計測サマリーメール下書き"}),t.jsx("p",{className:"adm-view-desc",children:"週次・月次の計測サマリーをテキストとしてクリップボードにコピーします。メール本文としてご利用ください。"}),t.jsx(W,{session:u}),t.jsx("hr",{className:"adm-divider"}),t.jsx("h2",{className:"adm-view-title",style:{marginTop:24},children:"組織レポート出力（PDF）"}),t.jsx("p",{className:"adm-view-desc",children:"期間比較・部署間ベンチマーク・チーム推移を含むA4レポートをPDFとして出力します。"}),t.jsx("button",{className:"adm-btn-primary",onClick:()=>Y(u,x),children:"組織レポートをPDF出力"})]})}function H({session:u,teams:x}){const[i,h]=g.useState(""),[f,d]=g.useState(!1),[r,p]=g.useState("");g.useEffect(()=>{(async()=>{d(!0);try{const l=r?{teamId:r}:{},a=await C.exportMemberCSV(u.orgId,l);h(a)}catch{h("エラーが発生しました")}d(!1)})()},[u.orgId,r]);const v=()=>{const a=new Blob(["\uFEFF"+i],{type:"text/csv;charset=utf-8"}),n=URL.createObjectURL(a),c=document.createElement("a");c.href=n,c.download=`mirucare-members-${new Date().toISOString().split("T")[0]}.csv`,c.click(),URL.revokeObjectURL(n)};return t.jsxs("div",{children:[t.jsxs("div",{className:"adm-export-field",children:[t.jsx("label",{className:"adm-export-label",children:"部署フィルター"}),t.jsxs("select",{className:"adm-export-select",value:r,onChange:l=>p(l.target.value),"aria-label":"メンバーCSV部署フィルター",children:[t.jsx("option",{value:"",children:"全部署"}),(x||[]).map(l=>t.jsx("option",{value:l.id,children:l.name},l.id))]})]}),t.jsx("button",{className:"adm-btn-primary",onClick:v,disabled:!i||f,style:{marginTop:8},children:"メンバーCSVをダウンロード"}),i&&t.jsxs(t.Fragment,{children:[t.jsx("h3",{className:"adm-section-title",style:{marginTop:16},children:"プレビュー"}),t.jsx("pre",{className:"adm-csv-preview",children:i.split(`
`).slice(0,11).join(`
`)})]})]})}function W({session:u}){const[x,i]=g.useState("weekly"),[h,f]=g.useState(""),[d,r]=g.useState(!1),[p,v]=g.useState(!1),l=async()=>{r(!0),v(!1);try{const n=await C.generateMeasurementSummary(u.orgId,{period:x});f(n)}catch{f("エラーが発生しました")}r(!1)};g.useEffect(()=>{l()},[u.orgId,x]);const a=async()=>{try{await navigator.clipboard.writeText(h),v(!0),setTimeout(()=>v(!1),2e3)}catch{const n=document.createElement("textarea");n.value=h,document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n),v(!0),setTimeout(()=>v(!1),2e3)}};return t.jsxs("div",{children:[t.jsxs("div",{className:"adm-export-field",children:[t.jsx("label",{className:"adm-export-label",children:"期間"}),t.jsxs("select",{className:"adm-export-select",value:x,onChange:n=>i(n.target.value),"aria-label":"サマリー期間",children:[t.jsx("option",{value:"weekly",children:"週次（直近7日間）"}),t.jsx("option",{value:"monthly",children:"月次（直近30日間）"})]})]}),t.jsx("button",{className:"adm-btn-primary",onClick:a,disabled:!h||d,style:{marginTop:8},children:p?"コピーしました":"クリップボードにコピー"}),h&&t.jsxs(t.Fragment,{children:[t.jsx("h3",{className:"adm-section-title",style:{marginTop:16},children:"プレビュー"}),t.jsx("pre",{className:"adm-csv-preview",children:h})]})]})}function P(u,x){const r=u.length*34+20,p=100,v=u.map((a,n)=>{const c=n*34+10,j=Math.max(2,a.thisAvg/p*360),k=a.thisAvg>60?"#ef4444":a.thisAvg>40?"#f59e0b":"#22c55e";return`
      <text x="72" y="${c+28/2+4}" text-anchor="end" font-size="9" fill="#333">${a.name}</text>
      <rect x="80" y="${c}" width="${j}" height="28" rx="4" fill="${k}" opacity="0.85"/>
      <text x="${80+j+6}" y="${c+28/2+4}" font-size="9" font-weight="600" fill="#333">${a.thisAvg}</text>
    `}).join(""),l=80+x/p*360;return`<svg viewBox="0 0 500 ${r}" width="100%" preserveAspectRatio="xMidYMid meet" style="margin:8px 0 12px">
    ${v}
    <line x1="${l}" y1="4" x2="${l}" y2="${r-4}" stroke="#4f8cff" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="${l}" y="${r}" text-anchor="middle" font-size="7" fill="#4f8cff">平均 ${x}</text>
  </svg>`}function V(u,x,i){const h=u.filter(o=>o.lastAvg!=null||o.thisAvg!=null);if(h.length===0)return"";const f=80,d=28,r=180,p=20,v=40,l=30,a=l+h.length*f+20,n=100,c=r-p-v,j=h.map((o,b)=>{const e=l+b*f+(f-d*2-6)/2,y=o.lastAvg!=null?o.lastAvg/n*c:0,w=o.thisAvg!=null?o.thisAvg/n*c:0,N=p+c-y,S=p+c-w;return`
      ${o.lastAvg!=null?`<rect x="${e}" y="${N}" width="${d}" height="${y}" rx="3" fill="#94a3b8" opacity="0.7"/>
      <text x="${e+d/2}" y="${N-3}" text-anchor="middle" font-size="7" fill="#666">${o.lastAvg}</text>`:""}
      ${o.thisAvg!=null?`<rect x="${e+d+6}" y="${S}" width="${d}" height="${w}" rx="3" fill="#4f8cff" opacity="0.85"/>
      <text x="${e+d+6+d/2}" y="${S-3}" text-anchor="middle" font-size="7" fill="#4f8cff">${o.thisAvg}</text>`:""}
      <text x="${e+d+3}" y="${r-10}" text-anchor="middle" font-size="8" fill="#333">${o.name}</text>
    `}).join(""),k=[0,25,50,75].map(o=>{const b=p+c-o/n*c;return`<line x1="${l}" y1="${b}" x2="${a-10}" y2="${b}" stroke="#e5e7eb" stroke-width="0.5"/>
    <text x="${l-4}" y="${b+3}" text-anchor="end" font-size="7" fill="#999">${o}</text>`}).join("");return`<svg viewBox="0 0 ${a} ${r}" width="100%" preserveAspectRatio="xMidYMid meet" style="margin:8px 0 4px">
    ${k}
    <line x1="${l}" y1="${p}" x2="${l}" y2="${p+c}" stroke="#ccc" stroke-width="0.5"/>
    ${j}
    <rect x="${a-100}" y="2" width="10" height="10" rx="2" fill="#94a3b8" opacity="0.7"/>
    <text x="${a-86}" y="11" font-size="8" fill="#666">${x}</text>
    <rect x="${a-50}" y="2" width="10" height="10" rx="2" fill="#4f8cff" opacity="0.85"/>
    <text x="${a-36}" y="11" font-size="8" fill="#4f8cff">${i}</text>
  </svg>`}async function Y(u,x){const i=new Date,h=new Date(i.getFullYear(),i.getMonth(),1),f=new Date(i.getFullYear(),i.getMonth()+1,0,23,59,59,999),d=new Date(i.getFullYear(),i.getMonth()-1,1),r=new Date(i.getFullYear(),i.getMonth(),0,23,59,59,999),p=`${h.getFullYear()}年${h.getMonth()+1}月`,v=`${d.getFullYear()}年${d.getMonth()+1}月`,l=`${i.getFullYear()}年${i.getMonth()+1}月${i.getDate()}日`,a=[];let n=0,c=0,j=0,k=0;for(const s of x){const m=await C.getTeamStats(s.id,{from:h.toISOString(),to:f.toISOString()}),$=await C.getTeamStats(s.id,{from:d.toISOString(),to:r.toISOString()}),M=m.stats&&!m.privacyFiltered?m.stats.avgStress:null,F=$.stats&&!$.privacyFiltered?$.stats.avgStress:null,z=m.stats?m.stats.measurementCount:0,I=$.stats?$.stats.measurementCount:0;M!=null&&(n+=M*z,c+=z),F!=null&&(j+=F*I,k+=I),a.push({name:s.name,thisAvg:M,lastAvg:F,thisCount:z,lastCount:I})}const o=c>0?Math.round(n/c):null,b=k>0?Math.round(j/k):null,e=o!=null&&b!=null?o-b:null,y=s=>{if(s==null)return'<span style="color:#9ca3af">---</span>';const m=L(s);return`<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:9pt;font-weight:600;color:#fff;background:${m.color}">${s} ${m.label}</span>`},w=s=>s==null?"#9ca3af":s<-3?"#22c55e":s>3?"#ef4444":"#9ca3af",N=s=>s==null?"":s<-3?"改善":s>3?"悪化":"横ばい",S=a.filter(s=>s.thisAvg!=null),T=[...S].sort((s,m)=>(s.thisAvg||0)-(m.thisAvg||0)),A=S.length>0?Math.round(S.reduce((s,m)=>s+m.thisAvg,0)/S.length):null,R=a.map(s=>{const m=s.thisAvg!=null&&s.lastAvg!=null?s.thisAvg-s.lastAvg:null;return`<tr>
      <td>${s.name}</td>
      <td>${y(s.lastAvg)}</td>
      <td>${y(s.thisAvg)}</td>
      <td style="color:${w(m)};font-weight:600">${m!=null?`${m>0?"+":""}${m}`:"---"} <small style="font-weight:400">${N(m)}</small></td>
    </tr>`}).join(""),O=T.map((s,m)=>{const $=A!=null?s.thisAvg-A:null;return`<tr>
      <td>${m+1}</td>
      <td>${s.name}</td>
      <td>${y(s.thisAvg)}</td>
      <td style="color:${w($!=null&&$>5?10:$!=null&&$<-5?-10:0)}">${$!=null?`${$>0?"+":""}${$}`:"---"}</td>
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
      <div class="date">${l}</div>
      <div>レポート出力日</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">期間比較（${v} → ${p}）</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-value">${b??"---"}</div>
        <div class="kpi-label">${v}</div>
        <div class="kpi-sub">${b!=null?L(b).label:"データなし"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${o??"---"}</div>
        <div class="kpi-label">${p}</div>
        <div class="kpi-sub">${o!=null?L(o).label:"データなし"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:${e!=null?e<0?"#22c55e":e>0?"#ef4444":"#333":"#999"}">${e!=null?`${e>0?"+":""}${e}`:"---"}</div>
        <div class="kpi-label">前月比</div>
        <div class="kpi-sub">${e!=null?e<0?"改善":e>0?"悪化":"変化なし":""}</div>
      </div>
    </div>

    <table>
      <thead><tr><th>部署</th><th>${v}</th><th>${p}</th><th>変化</th></tr></thead>
      <tbody>${R}</tbody>
    </table>
  </div>

  ${T.length>=2?`
  <div class="section">
    <div class="section-title">部署間ベンチマーク</div>
    ${P(T,A)}
    <table>
      <thead><tr><th>順位</th><th>部署</th><th>ストレススコア</th><th>組織平均との差</th></tr></thead>
      <tbody>${O}</tbody>
    </table>
    <p style="font-size:8pt;color:#888;margin-top:4px">※ 組織平均: ${A}（${T.length}部署の集計）</p>
  </div>
  `:""}

  ${a.length>=2&&a.some(s=>s.lastAvg!=null)&&a.some(s=>s.thisAvg!=null)?`
  <div class="section">
    <div class="section-title">部署別ストレス推移チャート</div>
    ${V(a,v,p)}
  </div>
  `:""}

  <div class="section">
    <div class="section-title">計測状況</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-value">${c}</div>
        <div class="kpi-label">${p} 計測数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${x.length}</div>
        <div class="kpi-label">部署数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${S.length}</div>
        <div class="kpi-label">集計可能部署</div>
      </div>
    </div>
  </div>

  <div class="disclaimer">
    <p>※ 本レポートはウェルネス参考値を提供するものであり、医療機器による診断結果ではありません。</p>
    <p>※ 個人の計測データは含まれません。1日の計測者が5名未満の部署データは除外されます。</p>
    <p>※ カメラ映像は処理後に即時破棄され、外部サーバーへの送信は行われません。</p>
  </div>
  <div class="footer">ミルケア（MiruCare）— 組織ストレスレポート | ${l}</div>
</div>

<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };<\/script>
</body>
</html>`,D=window.open("","_blank");if(!D){alert("ポップアップがブロックされています。ブラウザの設定でポップアップを許可してください。");return}D.document.write(E),D.document.close()}export{J as default};
