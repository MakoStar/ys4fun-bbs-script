// ==UserScript==
// @name         深空之眼官方论坛脚本
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  打开论坛首页自动做每日任务
// @author       MakoStar
// @match        *://bbs.ys4fun.com/*
// @require      https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ys4fun.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /**
     * 暂时不优化了，能用就用着吧。
     */

    // 本地存储的 dzq-server-id
    const __dzq = localStorage.getItem('__dzq-server-id')

    // 发起请求查询登录状态
    async function isLogin(dzq) {
        const response = await fetch(`https://bbs.ys4fun.com/api/v3/tom.permissions?dzqSid=${dzq}&dzqPf=pc`)
        const result = await response.json()
        if (result.Code === -4002) {
            return false
        }else {
            return true
        }
    }

    // 获取每日任务完成进度
    async function getTheDailyTaskState(dzq) {
        const response = await fetch(`https://bbs.ys4fun.com/plugin/ysGrow/api/grow/today?dzqSid=${dzq}&dzqPf=pc`)
        const result = await response.json()
        return result.Data
    }

    // 获取帖子页面id
    function getPageThreadId() {
        return new Promise((resolve, reject) => {
            setTimeout(()=>{
                let resultArr = []
                $('._1AZQpvvEUDE1r1Tm0GHU1o[data-id]').each((i,e) => {
                    resultArr.push($(e).attr('data-id'))
                })
                resultArr ? resolve(resultArr) : reject(resultArr)
            },1500)
        })
            .then(data => {
            return data
        })
    }

    // 获取帖子 post 请求 id
    async function getPostRequestId(dzq) {
        let resultArr = []
        const pageIdArr = await getPageThreadId()
        for (const i of pageIdArr) {
            const queryData = await getRequestData(i, dzq)
            resultArr.push(queryData)
        }
        return resultArr
    }

    // 发送请求获取页面请求数据
    async function getRequestData(pageId, dzq) {
        const response = await fetch(`https://bbs.ys4fun.com/api/v3/thread.detail?threadId=${pageId}&dzqSid=${dzq}&dzqPf=pc`)
        const result = await response.json()
        return result.Data
    }

    // 发送更改点赞状态请求
    function sendChangeLikeRequest(pageId, postId, state) {
        fetch('https://bbs.ys4fun.com/api/v3/posts.update',{
            method: 'POST',
            body: JSON.stringify({ id: pageId, postId: postId, data: { attributes: { isLiked: state } } }),
            headers: {
                "Content-type":"application/json"
            }
        })
            .then( response => response.json() )
            .then( data => console.log(['点赞', data]) )
    }

    // 更改点赞状态 + 评论
    function changeLikeState(requestData, state) {
        for (const obj of requestData) {
            sendChangeLikeRequest(obj.threadId, obj.postId, state)
            postingMessage(obj.threadId, __dzq)
            share(obj.threadId, __dzq)
        }
    }

    // 获取话题标签
    async function getTopicsTag(dzq) {
        const response = await fetch(`https://bbs.ys4fun.com/api/v3/topics.list?filter[thread]=1&filter[recommended]=1&dzqSid=${dzq}&dzqPf=pc`)
        const result = await response.json()
        return result.Data.pageData[0].content
    }

    // 发送请求创建帖子
    function createPost(dzq, topics) {
        fetch(`https://bbs.ys4fun.com/api/v3/thread.create?dzqSid=${dzq}&dzqPf=pc`,{
            method: 'POST',
            body: JSON.stringify({
                "title": "Sign in",
                "categoryId": 5,
                "content": {
                    "text": `<p>#${ topics }#</p>\n<p>${ new Date() }</p>\n`
                },
                "position": {},
                "price": 0,
                "freeWords": 0,
                "attachmentPrice": 0,
                "draft": 0,
                "anonymous": 0
            }),
            headers: {
                "Content-type":"application/json"
            }
        })
            .then( response => response.json() )
            .then( data => {
                console.log(['发帖', data])
                setTimeout(() => {
                    deletePost(data.Data.threadId, dzq)
                },2000)
            } )
    }

    // 删除帖子
    function deletePost(threadId, dzq) {
        fetch(`https://bbs.ys4fun.com/api/v3/thread.delete?dzqSid=${ dzq }&dzqPf=pc`, {
            method: 'POST',
            body: JSON.stringify({threadId: threadId}),
            headers: {
                "Content-type":"application/json"
            }
        })
            .then( response => response.json() )
            .then( data => {console.log(['删帖', data])} )
    }

    // 发送评论
    function postingMessage(pageId, dzq) {
        fetch(`https://bbs.ys4fun.com/api/v3/posts.create?dzqSid=${ dzq }&dzqPf=pc`, {
            method: 'POST',
            body: JSON.stringify({id: pageId, content: ":tired:ysemoji:", attachments: []}),
            headers: {
                "Content-type":"application/json"
            }
        })
            .then( response => response.json() )
            .then( data => {console.log(['评论', data])} )
    }

    // 每日分享
    function share(pageId, dzq) {

        fetch(`https://bbs.ys4fun.com/api/v3/thread.share?dzqSid=${ dzq }&dzqPf=pc`, {
            method: 'POST',
            body: JSON.stringify({threadId: pageId}),
            headers: {
                "Content-type":"application/json"
            }
        })
            .then( response => response.json() )
            .then( data => {console.log(['分享', data])} )
    }

    try {
        isLogin(__dzq).then(isLoginResult => {

            // 访客状态提示登录
            if (!isLoginResult) {

                setTimeout(()=>{

                    alert('当前处与访客状态请登录！')

                }, 2000)

                return
            }

            // 查询每日任务完成状态 未完成的执行相应操作
            getTheDailyTaskState(__dzq).then(result => {

                console.log(result)

                if (result.length === 1 || result.length <= 5 || result === []) {

                    getPostRequestId(__dzq).then((requestData) => {

                        changeLikeState(requestData, true)

                    })

                    getTopicsTag(__dzq).then((requestData) => {

                        createPost(__dzq, requestData)

                    })
                }else {

                    console.log('每日任务已完成')

                }
            })
        })
    }
    catch( err ){
        console.log(err)
    }

})();