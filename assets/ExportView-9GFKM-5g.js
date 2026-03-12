import{r as A,j as s}from"./index-ynryam8i.js";import{d as I}from"./index-DagOqNjN.js";import{stressStatus as H}from"./AdminDashboard-4w7AXaCr.js";/* empty css                        */function G({session:S,teams:$}){const[n,x]=A.useState(()=>{const t=new Date;return t.setDate(t.getDate()-7),t.toISOString().split("T")[0]}),[b,c]=A.useState(()=>new Date().toISOString().split("T")[0]),[h,r]=A.useState(""),[f,d]=A.useState("mirucare-report"),[a,u]=A.useState(""),[o,w]=A.useState(!1),k=async()=>{w(!0);try{const t={from:n,to:b+"T23:59:59.999Z"};h&&(t.teamId=h);const g=await I.exportCSV(S.orgId,t);u(g)}catch{u("エラーが発生しました")}w(!1)};A.useEffect(()=>{k()},[n,b,h]);const i=()=>{const g=new Blob(["\uFEFF"+a],{type:"text/csv;charset=utf-8"}),m=URL.createObjectURL(g),j=document.createElement("a");j.href=m;const y=f.trim()||"mirucare-report";j.download=`${y}-${new Date().toISOString().split("T")[0]}.csv`,j.click(),URL.revokeObjectURL(m)},p=t=>{const g=new Date,m=new Date;m.setDate(m.getDate()-t),x(m.toISOString().split("T")[0]),c(g.toISOString().split("T")[0])};return s.jsxs("div",{className:"adm-view",children:[s.jsx("h2",{className:"adm-view-title",children:"CSVデータ出力"}),s.jsx("p",{className:"adm-view-desc",children:"部署別ストレス・HRVデータをCSV形式でエクスポートします。RMSSD・SDNN・pNN50・LF/HF・呼吸数を含む全指標を出力します。稟議書や社内報告書への添付にご利用ください。"}),s.jsx("h3",{className:"adm-section-title",children:"期間選択"}),s.jsxs("div",{className:"adm-date-range",children:[s.jsxs("label",{children:["開始日:",s.jsx("input",{type:"date",value:n,onChange:t=>x(t.target.value)})]}),s.jsxs("label",{children:["終了日:",s.jsx("input",{type:"date",value:b,onChange:t=>c(t.target.value)})]})]}),s.jsxs("div",{className:"adm-quick-range",children:[s.jsx("button",{className:"adm-btn-ghost",onClick:()=>p(7),children:"直近1週間"}),s.jsx("button",{className:"adm-btn-ghost",onClick:()=>p(30),children:"直近1ヶ月"}),s.jsx("button",{className:"adm-btn-ghost",onClick:()=>p(365),children:"全期間"})]}),s.jsx("h3",{className:"adm-section-title",children:"部署フィルター"}),s.jsx("div",{className:"adm-export-field",children:s.jsxs("select",{className:"adm-export-select",value:h,onChange:t=>r(t.target.value),children:[s.jsx("option",{value:"",children:"全部署"}),$.map(t=>s.jsx("option",{value:t.id,children:t.name},t.id))]})}),s.jsxs("div",{className:"adm-export-privacy",children:[s.jsx("p",{children:"個人の計測データは含まれません"}),s.jsx("p",{children:"1日の計測者が5名未満の部署データは除外されます"})]}),s.jsx("button",{className:"adm-btn-primary",onClick:i,disabled:!a||o,children:"CSVをダウンロード"}),s.jsxs("div",{className:"adm-export-field",style:{marginTop:12},children:[s.jsx("label",{className:"adm-export-label",children:"ファイル名"}),s.jsxs("div",{className:"adm-export-filename",children:[s.jsx("input",{type:"text",className:"adm-export-input",value:f,onChange:t=>d(t.target.value),placeholder:"mirucare-report"}),s.jsxs("span",{className:"adm-export-suffix",children:["-",new Date().toISOString().split("T")[0],".csv"]})]})]}),a&&s.jsxs(s.Fragment,{children:[s.jsx("h3",{className:"adm-section-title",style:{marginTop:24},children:"プレビュー"}),s.jsx("pre",{className:"adm-csv-preview",children:a.split(`
`).slice(0,11).join(`
`)})]}),s.jsx("hr",{className:"adm-divider"}),s.jsx("h2",{className:"adm-view-title",style:{marginTop:24},children:"組織レポート出力（PDF）"}),s.jsx("p",{className:"adm-view-desc",children:"期間比較・部署間ベンチマーク・チーム推移を含むA4レポートをPDFとして出力します。"}),s.jsx("button",{className:"adm-btn-primary",onClick:()=>P(S,$),children:"組織レポートをPDF出力"})]})}function W(S,$){const h=S.length*34+20,r=100,f=S.map((a,u)=>{const o=u*34+10,w=Math.max(2,a.thisAvg/r*360),k=a.thisAvg>60?"#ef4444":a.thisAvg>40?"#f59e0b":"#22c55e";return`
      <text x="72" y="${o+28/2+4}" text-anchor="end" font-size="9" fill="#333">${a.name}</text>
      <rect x="80" y="${o}" width="${w}" height="28" rx="4" fill="${k}" opacity="0.85"/>
      <text x="${80+w+6}" y="${o+28/2+4}" font-size="9" font-weight="600" fill="#333">${a.thisAvg}</text>
    `}).join(""),d=80+$/r*360;return`<svg viewBox="0 0 500 ${h}" width="100%" preserveAspectRatio="xMidYMid meet" style="margin:8px 0 12px">
    ${f}
    <line x1="${d}" y1="4" x2="${d}" y2="${h-4}" stroke="#4f8cff" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="${d}" y="${h}" text-anchor="middle" font-size="7" fill="#4f8cff">平均 ${$}</text>
  </svg>`}function Y(S,$,n){const x=S.filter(i=>i.lastAvg!=null||i.thisAvg!=null);if(x.length===0)return"";const b=80,c=28,h=180,r=20,f=40,d=30,a=d+x.length*b+20,u=100,o=h-r-f,w=x.map((i,p)=>{const t=d+p*b+(b-c*2-6)/2,g=i.lastAvg!=null?i.lastAvg/u*o:0,m=i.thisAvg!=null?i.thisAvg/u*o:0,j=r+o-g,y=r+o-m;return`
      ${i.lastAvg!=null?`<rect x="${t}" y="${j}" width="${c}" height="${g}" rx="3" fill="#94a3b8" opacity="0.7"/>
      <text x="${t+c/2}" y="${j-3}" text-anchor="middle" font-size="7" fill="#666">${i.lastAvg}</text>`:""}
      ${i.thisAvg!=null?`<rect x="${t+c+6}" y="${y}" width="${c}" height="${m}" rx="3" fill="#4f8cff" opacity="0.85"/>
      <text x="${t+c+6+c/2}" y="${y-3}" text-anchor="middle" font-size="7" fill="#4f8cff">${i.thisAvg}</text>`:""}
      <text x="${t+c+3}" y="${h-10}" text-anchor="middle" font-size="8" fill="#333">${i.name}</text>
    `}).join(""),k=[0,25,50,75].map(i=>{const p=r+o-i/u*o;return`<line x1="${d}" y1="${p}" x2="${a-10}" y2="${p}" stroke="#e5e7eb" stroke-width="0.5"/>
    <text x="${d-4}" y="${p+3}" text-anchor="end" font-size="7" fill="#999">${i}</text>`}).join("");return`<svg viewBox="0 0 ${a} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" style="margin:8px 0 4px">
    ${k}
    <line x1="${d}" y1="${r}" x2="${d}" y2="${r+o}" stroke="#ccc" stroke-width="0.5"/>
    ${w}
    <rect x="${a-100}" y="2" width="10" height="10" rx="2" fill="#94a3b8" opacity="0.7"/>
    <text x="${a-86}" y="11" font-size="8" fill="#666">${$}</text>
    <rect x="${a-50}" y="2" width="10" height="10" rx="2" fill="#4f8cff" opacity="0.85"/>
    <text x="${a-36}" y="11" font-size="8" fill="#4f8cff">${n}</text>
  </svg>`}async function P(S,$){const n=new Date,x=new Date(n.getFullYear(),n.getMonth(),1),b=new Date(n.getFullYear(),n.getMonth()+1,0,23,59,59,999),c=new Date(n.getFullYear(),n.getMonth()-1,1),h=new Date(n.getFullYear(),n.getMonth(),0,23,59,59,999),r=`${x.getFullYear()}年${x.getMonth()+1}月`,f=`${c.getFullYear()}年${c.getMonth()+1}月`,d=`${n.getFullYear()}年${n.getMonth()+1}月${n.getDate()}日`,a=[];let u=0,o=0,w=0,k=0;for(const e of $){const l=await I.getTeamStats(e.id,{from:x.toISOString(),to:b.toISOString()}),v=await I.getTeamStats(e.id,{from:c.toISOString(),to:h.toISOString()}),C=l.stats&&!l.privacyFiltered?l.stats.avgStress:null,M=v.stats&&!v.privacyFiltered?v.stats.avgStress:null,F=l.stats?l.stats.measurementCount:0,T=v.stats?v.stats.measurementCount:0;C!=null&&(u+=C*F,o+=F),M!=null&&(w+=M*T,k+=T),a.push({name:e.name,thisAvg:C,lastAvg:M,thisCount:F,lastCount:T})}const i=o>0?Math.round(u/o):null,p=k>0?Math.round(w/k):null,t=i!=null&&p!=null?i-p:null,g=e=>{if(e==null)return'<span style="color:#9ca3af">---</span>';const l=H(e);return`<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:9pt;font-weight:600;color:#fff;background:${l.color}">${e} ${l.label}</span>`},m=e=>e==null?"#9ca3af":e<-3?"#22c55e":e>3?"#ef4444":"#9ca3af",j=e=>e==null?"":e<-3?"改善":e>3?"悪化":"横ばい",y=a.filter(e=>e.thisAvg!=null),N=[...y].sort((e,l)=>(e.thisAvg||0)-(l.thisAvg||0)),D=y.length>0?Math.round(y.reduce((e,l)=>e+l.thisAvg,0)/y.length):null,L=a.map(e=>{const l=e.thisAvg!=null&&e.lastAvg!=null?e.thisAvg-e.lastAvg:null;return`<tr>
      <td>${e.name}</td>
      <td>${g(e.lastAvg)}</td>
      <td>${g(e.thisAvg)}</td>
      <td style="color:${m(l)};font-weight:600">${l!=null?`${l>0?"+":""}${l}`:"---"} <small style="font-weight:400">${j(l)}</small></td>
    </tr>`}).join(""),O=N.map((e,l)=>{const v=D!=null?e.thisAvg-D:null;return`<tr>
      <td>${l+1}</td>
      <td>${e.name}</td>
      <td>${g(e.thisAvg)}</td>
      <td style="color:${m(v!=null&&v>5?10:v!=null&&v<-5?-10:0)}">${v!=null?`${v>0?"+":""}${v}`:"---"}</td>
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
      <div class="date">${d}</div>
      <div>レポート出力日</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">期間比較（${f} → ${r}）</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-value">${p??"---"}</div>
        <div class="kpi-label">${f}</div>
        <div class="kpi-sub">${p!=null?H(p).label:"データなし"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${i??"---"}</div>
        <div class="kpi-label">${r}</div>
        <div class="kpi-sub">${i!=null?H(i).label:"データなし"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:${t!=null?t<0?"#22c55e":t>0?"#ef4444":"#333":"#999"}">${t!=null?`${t>0?"+":""}${t}`:"---"}</div>
        <div class="kpi-label">前月比</div>
        <div class="kpi-sub">${t!=null?t<0?"改善":t>0?"悪化":"変化なし":""}</div>
      </div>
    </div>

    <table>
      <thead><tr><th>部署</th><th>${f}</th><th>${r}</th><th>変化</th></tr></thead>
      <tbody>${L}</tbody>
    </table>
  </div>

  ${N.length>=2?`
  <div class="section">
    <div class="section-title">部署間ベンチマーク</div>
    ${W(N,D)}
    <table>
      <thead><tr><th>順位</th><th>部署</th><th>ストレススコア</th><th>組織平均との差</th></tr></thead>
      <tbody>${O}</tbody>
    </table>
    <p style="font-size:8pt;color:#888;margin-top:4px">※ 組織平均: ${D}（${N.length}部署の集計）</p>
  </div>
  `:""}

  ${a.length>=2&&a.some(e=>e.lastAvg!=null)&&a.some(e=>e.thisAvg!=null)?`
  <div class="section">
    <div class="section-title">部署別ストレス推移チャート</div>
    ${Y(a,f,r)}
  </div>
  `:""}

  <div class="section">
    <div class="section-title">計測状況</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-value">${o}</div>
        <div class="kpi-label">${r} 計測数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${$.length}</div>
        <div class="kpi-label">部署数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${y.length}</div>
        <div class="kpi-label">集計可能部署</div>
      </div>
    </div>
  </div>

  <div class="disclaimer">
    <p>※ 本レポートはウェルネス参考値を提供するものであり、医療機器による診断結果ではありません。</p>
    <p>※ 個人の計測データは含まれません。1日の計測者が5名未満の部署データは除外されます。</p>
    <p>※ カメラ映像は処理後に即時破棄され、外部サーバーへの送信は行われません。</p>
  </div>
  <div class="footer">ミルケア（MiruCare）— 組織ストレスレポート | ${d}</div>
</div>

<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };<\/script>
</body>
</html>`,z=window.open("","_blank");if(!z){alert("ポップアップがブロックされています。ブラウザの設定でポップアップを許可してください。");return}z.document.write(R),z.document.close()}export{G as default};
