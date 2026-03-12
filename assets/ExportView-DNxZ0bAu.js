import{r as f,j as t}from"./index-DJ0VWPxF.js";import{d as $}from"./index-CNKEHbzI.js";import{s as L}from"./AdminDashboard-C57-DJG-.js";/* empty css                        */function Q({session:e,teams:p}){const[i,d]=f.useState(()=>{const s=new Date;return s.setDate(s.getDate()-7),s.toISOString().split("T")[0]}),[x,h]=f.useState(()=>new Date().toISOString().split("T")[0]),[c,o]=f.useState(""),[m,r]=f.useState("mirucare-report"),[l,n]=f.useState(""),[g,S]=f.useState(!1),k=async()=>{S(!0);try{const s={from:i,to:x+"T23:59:59.999Z"};c&&(s.teamId=c);const j=await $.exportCSV(e.orgId,s);n(j)}catch{n("エラーが発生しました")}S(!1)};f.useEffect(()=>{k()},[i,x,c]);const u=()=>{const j=new Blob(["\uFEFF"+l],{type:"text/csv;charset=utf-8"}),w=URL.createObjectURL(j),I=document.createElement("a");I.href=w;const N=m.trim()||"mirucare-report";I.download=`${N}-${new Date().toISOString().split("T")[0]}.csv`,I.click(),URL.revokeObjectURL(w),$.logExport({userId:e.userId,userName:e.userName,orgId:e.orgId,type:"CSV（組織）",details:`期間: ${i}〜${x}${c?" 部署フィルター有":""}`})},b=s=>{const j=new Date,w=new Date;w.setDate(w.getDate()-s),d(w.toISOString().split("T")[0]),h(j.toISOString().split("T")[0])};return t.jsxs("div",{className:"adm-view",children:[t.jsx("h2",{className:"adm-view-title",children:"CSVデータ出力"}),t.jsx("p",{className:"adm-view-desc",children:"部署別ストレス・HRVデータをCSV形式でエクスポートします。RMSSD・SDNN・pNN50・LF/HF・呼吸数を含む全指標を出力します。稟議書や社内報告書への添付にご利用ください。"}),t.jsx("h3",{className:"adm-section-title",children:"期間選択"}),t.jsxs("div",{className:"adm-date-range",children:[t.jsxs("label",{children:["開始日:",t.jsx("input",{type:"date",value:i,onChange:s=>d(s.target.value)})]}),t.jsxs("label",{children:["終了日:",t.jsx("input",{type:"date",value:x,onChange:s=>h(s.target.value)})]})]}),t.jsxs("div",{className:"adm-quick-range",children:[t.jsx("button",{className:"adm-btn-ghost",onClick:()=>b(7),children:"直近1週間"}),t.jsx("button",{className:"adm-btn-ghost",onClick:()=>b(30),children:"直近1ヶ月"}),t.jsx("button",{className:"adm-btn-ghost",onClick:()=>b(365),children:"全期間"})]}),t.jsx("h3",{className:"adm-section-title",children:"部署フィルター"}),t.jsx("div",{className:"adm-export-field",children:t.jsxs("select",{className:"adm-export-select",value:c,onChange:s=>o(s.target.value),children:[t.jsx("option",{value:"",children:"全部署"}),p.map(s=>t.jsx("option",{value:s.id,children:s.name},s.id))]})}),t.jsxs("div",{className:"adm-export-privacy",children:[t.jsx("p",{children:"個人の計測データは含まれません"}),t.jsx("p",{children:"1日の計測者が5名未満の部署データは除外されます"})]}),t.jsx("button",{className:"adm-btn-primary",onClick:u,disabled:!l||g,children:"CSVをダウンロード"}),t.jsxs("div",{className:"adm-export-field",style:{marginTop:12},children:[t.jsx("label",{className:"adm-export-label",children:"ファイル名"}),t.jsxs("div",{className:"adm-export-filename",children:[t.jsx("input",{type:"text",className:"adm-export-input",value:m,onChange:s=>r(s.target.value),placeholder:"mirucare-report"}),t.jsxs("span",{className:"adm-export-suffix",children:["-",new Date().toISOString().split("T")[0],".csv"]})]})]}),l&&t.jsxs(t.Fragment,{children:[t.jsx("h3",{className:"adm-section-title",style:{marginTop:24},children:"プレビュー"}),t.jsx("pre",{className:"adm-csv-preview",children:l.split(`
`).slice(0,11).join(`
`)})]}),t.jsx("hr",{className:"adm-divider"}),t.jsx("h2",{className:"adm-view-title",style:{marginTop:24},children:"メンバー別CSV出力"}),t.jsx("p",{className:"adm-view-desc",children:"メンバー一覧と最終計測日をCSV形式でエクスポートします。計測未実施メンバーの把握にご利用ください。"}),t.jsx(V,{session:e,teams:p}),t.jsx("hr",{className:"adm-divider"}),t.jsx("h2",{className:"adm-view-title",style:{marginTop:24},children:"計測サマリーメール下書き"}),t.jsx("p",{className:"adm-view-desc",children:"週次・月次の計測サマリーをテキストとしてクリップボードにコピーします。メール本文としてご利用ください。"}),t.jsx(W,{session:e}),t.jsx("hr",{className:"adm-divider"}),t.jsx("h2",{className:"adm-view-title",style:{marginTop:24},children:"組織レポート出力（PDF）"}),t.jsx("p",{className:"adm-view-desc",children:"期間比較・部署間ベンチマーク・チーム推移を含むA4レポートをPDFとして出力します。"}),t.jsx("button",{className:"adm-btn-primary",onClick:()=>{Y(e,p),$.logExport({userId:e.userId,userName:e.userName,orgId:e.orgId,type:"PDF（組織レポート）",details:"期間比較・部署間ベンチマーク"})},children:"組織レポートをPDF出力"}),t.jsx("hr",{className:"adm-divider"}),t.jsx("h2",{className:"adm-view-title",style:{marginTop:24},children:"データバックアップ"}),t.jsx("p",{className:"adm-view-desc",children:"IndexedDBの全データをJSON形式でエクスポート/インポートします。デバイス移行やバックアップにご利用ください。"}),t.jsx(P,{session:e}),t.jsx("hr",{className:"adm-divider"}),t.jsx("h2",{className:"adm-view-title",style:{marginTop:24},children:"エクスポート履歴"}),t.jsx("p",{className:"adm-view-desc",children:"いつ誰がCSV/PDFを出力したかのログです（監査証跡）。"}),t.jsx(H,{orgId:e.orgId})]})}function H({orgId:e}){const p=$.getExportLogs(e);return p.length===0?t.jsx("p",{style:{color:"#888",fontSize:13},children:"エクスポート履歴はまだありません。"}):t.jsx("div",{style:{maxHeight:300,overflowY:"auto"},children:t.jsxs("table",{className:"adm-table",children:[t.jsx("thead",{children:t.jsxs("tr",{children:[t.jsx("th",{children:"日時"}),t.jsx("th",{children:"実行者"}),t.jsx("th",{children:"種別"}),t.jsx("th",{children:"詳細"})]})}),t.jsx("tbody",{children:p.slice(0,50).map(i=>t.jsxs("tr",{children:[t.jsx("td",{children:new Date(i.timestamp).toLocaleString("ja-JP",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}),t.jsx("td",{children:i.userName||"---"}),t.jsx("td",{children:i.type}),t.jsx("td",{style:{fontSize:12,color:"#666"},children:i.details})]},i.id))})]})})}function P({session:e}){const[p,i]=f.useState(!1),[d,x]=f.useState(null),h=async()=>{try{const o=await $.exportBackup(e.orgId),m=JSON.stringify(o,null,2),r=new Blob([m],{type:"application/json"}),l=URL.createObjectURL(r),n=document.createElement("a");n.href=l,n.download=`mirucare-backup-${new Date().toISOString().split("T")[0]}.json`,n.click(),URL.revokeObjectURL(l),$.logExport({userId:e.userId,userName:e.userName,orgId:e.orgId,type:"バックアップ（JSON）",details:"IndexedDB全データエクスポート"}),x({type:"success",text:"バックアップをダウンロードしました"})}catch(o){x({type:"error",text:"エクスポートに失敗しました: "+o.message})}},c=async o=>{const m=o.target.files?.[0];if(m){i(!0),x(null);try{const r=await m.text(),l=JSON.parse(r),n=await $.importBackup(l);x({type:"success",text:`インポート完了: 組織${n.orgs}件, ユーザー${n.users}件, チーム${n.teams}件, 計測${n.measurements}件`}),$.logExport({userId:e.userId,userName:e.userName,orgId:e.orgId,type:"バックアップインポート",details:`計測${n.measurements}件復元`})}catch(r){x({type:"error",text:"無効なバックアップファイルです: "+r.message})}i(!1),o.target.value=""}};return t.jsxs("div",{children:[t.jsxs("div",{style:{display:"flex",gap:8,flexWrap:"wrap"},children:[t.jsx("button",{className:"adm-btn-primary",onClick:h,children:"バックアップをエクスポート"}),t.jsxs("label",{className:"adm-btn-secondary",style:{cursor:"pointer"},children:[p?"インポート中...":"バックアップをインポート",t.jsx("input",{type:"file",accept:".json",onChange:c,style:{display:"none"},disabled:p,"aria-label":"バックアップファイル選択"})]})]}),d&&t.jsx("div",{className:d.type==="success"?"adm-settings-success":"adm-login-error",style:{marginTop:8},children:d.text}),t.jsx("p",{className:"adm-privacy-note",style:{marginTop:8},children:"※ バックアップには組織・チーム・計測データが含まれます。パスワードは含まれません。"})]})}function V({session:e,teams:p}){const[i,d]=f.useState(""),[x,h]=f.useState(!1),[c,o]=f.useState("");f.useEffect(()=>{(async()=>{h(!0);try{const r=c?{teamId:c}:{},l=await $.exportMemberCSV(e.orgId,r);d(l)}catch{d("エラーが発生しました")}h(!1)})()},[e.orgId,c]);const m=()=>{const l=new Blob(["\uFEFF"+i],{type:"text/csv;charset=utf-8"}),n=URL.createObjectURL(l),g=document.createElement("a");g.href=n,g.download=`mirucare-members-${new Date().toISOString().split("T")[0]}.csv`,g.click(),URL.revokeObjectURL(n),$.logExport({userId:e.userId,userName:e.userName,orgId:e.orgId,type:"CSV（メンバー一覧）",details:c?"部署フィルター有":"全部署"})};return t.jsxs("div",{children:[t.jsxs("div",{className:"adm-export-field",children:[t.jsx("label",{className:"adm-export-label",children:"部署フィルター"}),t.jsxs("select",{className:"adm-export-select",value:c,onChange:r=>o(r.target.value),"aria-label":"メンバーCSV部署フィルター",children:[t.jsx("option",{value:"",children:"全部署"}),(p||[]).map(r=>t.jsx("option",{value:r.id,children:r.name},r.id))]})]}),t.jsx("button",{className:"adm-btn-primary",onClick:m,disabled:!i||x,style:{marginTop:8},children:"メンバーCSVをダウンロード"}),i&&t.jsxs(t.Fragment,{children:[t.jsx("h3",{className:"adm-section-title",style:{marginTop:16},children:"プレビュー"}),t.jsx("pre",{className:"adm-csv-preview",children:i.split(`
`).slice(0,11).join(`
`)})]})]})}function W({session:e}){const[p,i]=f.useState("weekly"),[d,x]=f.useState(""),[h,c]=f.useState(!1),[o,m]=f.useState(!1),r=async()=>{c(!0),m(!1);try{const n=await $.generateMeasurementSummary(e.orgId,{period:p});x(n)}catch{x("エラーが発生しました")}c(!1)};f.useEffect(()=>{r()},[e.orgId,p]);const l=async()=>{try{await navigator.clipboard.writeText(d),m(!0),setTimeout(()=>m(!1),2e3)}catch{const n=document.createElement("textarea");n.value=d,document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n),m(!0),setTimeout(()=>m(!1),2e3)}};return t.jsxs("div",{children:[t.jsxs("div",{className:"adm-export-field",children:[t.jsx("label",{className:"adm-export-label",children:"期間"}),t.jsxs("select",{className:"adm-export-select",value:p,onChange:n=>i(n.target.value),"aria-label":"サマリー期間",children:[t.jsx("option",{value:"weekly",children:"週次（直近7日間）"}),t.jsx("option",{value:"monthly",children:"月次（直近30日間）"})]})]}),t.jsx("button",{className:"adm-btn-primary",onClick:l,disabled:!d||h,style:{marginTop:8},children:o?"コピーしました":"クリップボードにコピー"}),d&&t.jsxs(t.Fragment,{children:[t.jsx("h3",{className:"adm-section-title",style:{marginTop:16},children:"プレビュー"}),t.jsx("pre",{className:"adm-csv-preview",children:d})]})]})}function B(e,p){const c=e.length*34+20,o=100,m=e.map((l,n)=>{const g=n*34+10,S=Math.max(2,l.thisAvg/o*360),k=l.thisAvg>60?"#ef4444":l.thisAvg>40?"#f59e0b":"#22c55e";return`
      <text x="72" y="${g+28/2+4}" text-anchor="end" font-size="9" fill="#333">${l.name}</text>
      <rect x="80" y="${g}" width="${S}" height="28" rx="4" fill="${k}" opacity="0.85"/>
      <text x="${80+S+6}" y="${g+28/2+4}" font-size="9" font-weight="600" fill="#333">${l.thisAvg}</text>
    `}).join(""),r=80+p/o*360;return`<svg viewBox="0 0 500 ${c}" width="100%" preserveAspectRatio="xMidYMid meet" style="margin:8px 0 12px">
    ${m}
    <line x1="${r}" y1="4" x2="${r}" y2="${c-4}" stroke="#4f8cff" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="${r}" y="${c}" text-anchor="middle" font-size="7" fill="#4f8cff">平均 ${p}</text>
  </svg>`}function U(e,p,i){const d=e.filter(u=>u.lastAvg!=null||u.thisAvg!=null);if(d.length===0)return"";const x=80,h=28,c=180,o=20,m=40,r=30,l=r+d.length*x+20,n=100,g=c-o-m,S=d.map((u,b)=>{const s=r+b*x+(x-h*2-6)/2,j=u.lastAvg!=null?u.lastAvg/n*g:0,w=u.thisAvg!=null?u.thisAvg/n*g:0,I=o+g-j,N=o+g-w;return`
      ${u.lastAvg!=null?`<rect x="${s}" y="${I}" width="${h}" height="${j}" rx="3" fill="#94a3b8" opacity="0.7"/>
      <text x="${s+h/2}" y="${I-3}" text-anchor="middle" font-size="7" fill="#666">${u.lastAvg}</text>`:""}
      ${u.thisAvg!=null?`<rect x="${s+h+6}" y="${N}" width="${h}" height="${w}" rx="3" fill="#4f8cff" opacity="0.85"/>
      <text x="${s+h+6+h/2}" y="${N-3}" text-anchor="middle" font-size="7" fill="#4f8cff">${u.thisAvg}</text>`:""}
      <text x="${s+h+3}" y="${c-10}" text-anchor="middle" font-size="8" fill="#333">${u.name}</text>
    `}).join(""),k=[0,25,50,75].map(u=>{const b=o+g-u/n*g;return`<line x1="${r}" y1="${b}" x2="${l-10}" y2="${b}" stroke="#e5e7eb" stroke-width="0.5"/>
    <text x="${r-4}" y="${b+3}" text-anchor="end" font-size="7" fill="#999">${u}</text>`}).join("");return`<svg viewBox="0 0 ${l} ${c}" width="100%" preserveAspectRatio="xMidYMid meet" style="margin:8px 0 4px">
    ${k}
    <line x1="${r}" y1="${o}" x2="${r}" y2="${o+g}" stroke="#ccc" stroke-width="0.5"/>
    ${S}
    <rect x="${l-100}" y="2" width="10" height="10" rx="2" fill="#94a3b8" opacity="0.7"/>
    <text x="${l-86}" y="11" font-size="8" fill="#666">${p}</text>
    <rect x="${l-50}" y="2" width="10" height="10" rx="2" fill="#4f8cff" opacity="0.85"/>
    <text x="${l-36}" y="11" font-size="8" fill="#4f8cff">${i}</text>
  </svg>`}async function Y(e,p){const i=new Date,d=new Date(i.getFullYear(),i.getMonth(),1),x=new Date(i.getFullYear(),i.getMonth()+1,0,23,59,59,999),h=new Date(i.getFullYear(),i.getMonth()-1,1),c=new Date(i.getFullYear(),i.getMonth(),0,23,59,59,999),o=`${d.getFullYear()}年${d.getMonth()+1}月`,m=`${h.getFullYear()}年${h.getMonth()+1}月`,r=`${i.getFullYear()}年${i.getMonth()+1}月${i.getDate()}日`,l=[];let n=0,g=0,S=0,k=0;for(const a of p){const v=await $.getTeamStats(a.id,{from:d.toISOString(),to:x.toISOString()}),y=await $.getTeamStats(a.id,{from:h.toISOString(),to:c.toISOString()}),A=v.stats&&!v.privacyFiltered?v.stats.avgStress:null,M=y.stats&&!y.privacyFiltered?y.stats.avgStress:null,F=v.stats?v.stats.measurementCount:0,z=y.stats?y.stats.measurementCount:0;A!=null&&(n+=A*F,g+=F),M!=null&&(S+=M*z,k+=z),l.push({name:a.name,thisAvg:A,lastAvg:M,thisCount:F,lastCount:z})}const u=g>0?Math.round(n/g):null,b=k>0?Math.round(S/k):null,s=u!=null&&b!=null?u-b:null,j=a=>{if(a==null)return'<span style="color:#9ca3af">---</span>';const v=L(a);return`<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:9pt;font-weight:600;color:#fff;background:${v.color}">${a} ${v.label}</span>`},w=a=>a==null?"#9ca3af":a<-3?"#22c55e":a>3?"#ef4444":"#9ca3af",I=a=>a==null?"":a<-3?"改善":a>3?"悪化":"横ばい",N=l.filter(a=>a.thisAvg!=null),C=[...N].sort((a,v)=>(a.thisAvg||0)-(v.thisAvg||0)),T=N.length>0?Math.round(N.reduce((a,v)=>a+v.thisAvg,0)/N.length):null,E=l.map(a=>{const v=a.thisAvg!=null&&a.lastAvg!=null?a.thisAvg-a.lastAvg:null;return`<tr>
      <td>${a.name}</td>
      <td>${j(a.lastAvg)}</td>
      <td>${j(a.thisAvg)}</td>
      <td style="color:${w(v)};font-weight:600">${v!=null?`${v>0?"+":""}${v}`:"---"} <small style="font-weight:400">${I(v)}</small></td>
    </tr>`}).join(""),O=C.map((a,v)=>{const y=T!=null?a.thisAvg-T:null;return`<tr>
      <td>${v+1}</td>
      <td>${a.name}</td>
      <td>${j(a.thisAvg)}</td>
      <td style="color:${w(y!=null&&y>5?10:y!=null&&y<-5?-10:0)}">${y!=null?`${y>0?"+":""}${y}`:"---"}</td>
    </tr>`}).join(""),R=`<!DOCTYPE html>
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
    <div class="section-title">期間比較（${m} → ${o}）</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-value">${b??"---"}</div>
        <div class="kpi-label">${m}</div>
        <div class="kpi-sub">${b!=null?L(b).label:"データなし"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${u??"---"}</div>
        <div class="kpi-label">${o}</div>
        <div class="kpi-sub">${u!=null?L(u).label:"データなし"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:${s!=null?s<0?"#22c55e":s>0?"#ef4444":"#333":"#999"}">${s!=null?`${s>0?"+":""}${s}`:"---"}</div>
        <div class="kpi-label">前月比</div>
        <div class="kpi-sub">${s!=null?s<0?"改善":s>0?"悪化":"変化なし":""}</div>
      </div>
    </div>

    <table>
      <thead><tr><th>部署</th><th>${m}</th><th>${o}</th><th>変化</th></tr></thead>
      <tbody>${E}</tbody>
    </table>
  </div>

  ${C.length>=2?`
  <div class="section">
    <div class="section-title">部署間ベンチマーク</div>
    ${B(C,T)}
    <table>
      <thead><tr><th>順位</th><th>部署</th><th>ストレススコア</th><th>組織平均との差</th></tr></thead>
      <tbody>${O}</tbody>
    </table>
    <p style="font-size:8pt;color:#888;margin-top:4px">※ 組織平均: ${T}（${C.length}部署の集計）</p>
  </div>
  `:""}

  ${l.length>=2&&l.some(a=>a.lastAvg!=null)&&l.some(a=>a.thisAvg!=null)?`
  <div class="section">
    <div class="section-title">部署別ストレス推移チャート</div>
    ${U(l,m,o)}
  </div>
  `:""}

  <div class="section">
    <div class="section-title">計測状況</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-value">${g}</div>
        <div class="kpi-label">${o} 計測数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${p.length}</div>
        <div class="kpi-label">部署数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${N.length}</div>
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
</html>`,D=window.open("","_blank");if(!D){alert("ポップアップがブロックされています。ブラウザの設定でポップアップを許可してください。");return}D.document.write(R),D.document.close()}export{Q as default};
