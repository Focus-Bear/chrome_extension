const n=window.location.hostname;if(n.includes("wikipedia.org")){const o=()=>{document.querySelectorAll("#mw-content-text a[href]").forEach(e=>{e.dataset.focusbear||(e.dataset.focusbear="true",e.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation();const r=e.href;window.confirm(`Do you really need to follow this link?

${r}

Click OK to continue or Cancel to stay focused.`)&&(window.location.href=r)}))})};o(),new MutationObserver(o).observe(document.body,{childList:!0,subtree:!0})}
