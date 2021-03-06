const axios = require("axios")
const fsPromise = require("fs/promises")
/**
 * "BloggerId": 5132096,  //博主id
  "BloggerIdKey": "9bf548",  // sign值
  NoteIdKey
 */
const analyseMap = {
  BloggerIndex: "千瓜指数",
  Fans: "粉丝数",
  NoteCount: "笔记数量",
  AvgLike: "平均点赞",
  AvgCollect: "平均收藏",
  AvgComment: "平均评论",
  AvgShare: "平均分享",
  BloggerProp: "千瓜标签",
  BloggerId: "博客id",
  Location: "住址",
  NickName: "昵称",
  ShareFansRatio: "该篇粉丝分享率",
  RedId: "小红书号",
}

const instance = axios.create({
  baseURL: "http://api.qian-gua.com/",
  timeout: 1000,
  headers: {
    "X-Custom-Header": "foobar",
    Cookie:
      "_data_chl=key=baidu-xiaohongshuci-shuju; Hm_lvt_c6d9cdbaf0b464645ff2ee32a71ea1ae=1630233584; ASP.NET_SessionId=qx4oocimz0zrw1xl3chsjwot; User=UserId=8720d7c47772ef9e&Password=c49d283d77a92bab904ffae4a52f5a19&ChildId=0; Hm_lpvt_c6d9cdbaf0b464645ff2ee32a71ea1ae=1630233676",
  },
})
const getSearchList = (keyword, pageIndex = 0) =>
  instance.post("/v1/Note/GetNoteHotList", {
    Days: 30,
    EndTime: "",
    KeyWord: keyword,
    SortType: 1,
    StartTime: "",
    pageIndex,
    pageSize: 100, // 总共能获取的数量， 每页固定是10个
  })

const shapeSearchRes = response => {
  return response.data.Data.ItemList.map(item => {
    const { NoteIdKey, NoteId } = item
    return { NoteIdKey, NoteId }
  })
}

const getSearchResultByPages = pages => {
  let promises = []
  for (let i = 0; i < pages; i++) {
    promises.push(getSearchList("杭州美食我来推", i).then(shapeSearchRes))
  }
  return Promise.all(promises).then(data => {
    return data.reduce((res, item) => {
      res = [...res, ...item]
      return res
    }, [])
  })
}

// sign为NoteIdKey
const getNoteAnalyse = (sign, nodeId) =>
  instance.get(`/v1/Note/GetNoteAnalyse?sign=${sign}&noteId=${nodeId}`)

const shapeAnalyse = analyseResponse => {
  const resData = analyseResponse.data.Data
  const res = {}
  for (let [key, label] of Object.entries(analyseMap)) {
    res[label] = resData[key]
  }
  return res
}

// const start = async () => {
//   const resList = await getSearchResultByPages(5)
//   const data = new Uint8Array(Buffer.from(JSON.stringify(resList)))
//   await fsPromise.writeFile("./data.json", data)
// }

// start()

const delay = timeOut =>
  new Promise((res, rej) => {
    let s = setTimeout(() => {
      clearTimeout(s)
      res()
    }, timeOut)
  })

const getBloggerInfo = async () => {
  const bloggersStr = await fsPromise.readFile("./data.json")
  const bloggerList = JSON.parse(bloggersStr)
  const res = []
  for (let i = 0; i < bloggerList.length; i++) {
    await delay(1000)
    const blogger = bloggerList[i]
    console.log(`==================获取第${i}个作者信息==================`)
    await getNoteAnalyse(blogger.NoteIdKey, blogger.NoteId).then(item => {
      console.log(`结果是:`, item)
      const data = shapeAnalyse(item)
      res.push(data)
    })
    await fsPromise.writeFile("./bloggers.json", JSON.stringify(res))
  }
}
// getBloggerInfo()

/**
 * 筛选合适的博主
 */
const getSuitedBlogger = async () => {
  const bloggersStr = await fsPromise.readFile("./bloggers.json")
  const bloggers = JSON.parse(bloggersStr).reduce((res, item) => {
    if (res.find(b => b["博客id"] === item["博客id"])) {
      return res
    } else {
      res.push(item)
      return res
    }
  }, [])
  const res = bloggers.filter(item => {
    if (item["粉丝数"] < 2000 || item["粉丝数"] > 13000) return false
    if (item["笔记数量"] < 20) return false
    if (item["笔记数量"] > item["粉丝数"] * 0.03) return false
    if (item["该篇粉丝分享率"] < 0.03) return false
    return true
  })
  console.log(res, res.length)
  await fsPromise.writeFile("./result.json", JSON.stringify(res))
}
getSuitedBlogger()
