fetch("https://cz.niurouzhou.com/data_in.php", {  // http 版
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ /* 你的 data */ })
})
.then(res => res.json())
.then(result => console.log("成功:", result))
.catch(err => console.error("失败:", err));



