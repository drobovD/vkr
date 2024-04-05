/****************************** Global variables ******************************/

let currentSelection

/****************************** Context menu ******************************/

chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        id: "addLinkContextMenu",
        title: "Добавить ссылку",
        contexts: ["link"]
    });

    chrome.contextMenus.create({
        id: "addTextContextMenu",
        title: "Добавить текст",
        contexts: ["selection"]
    });
})

// chrome.contextMenus.onClicked.addListener(async function (info, tab) {
//     if (info.menuItemId === "addTextContextMenu") {
//         const data = {
//             // title: currentSelection,
//             title: info.selectionText,
//             url: info.pageUrl,
//             tags: '',
//             comment: ''
//         }
//         await createRecord('article', data)
//     } else if (info.menuItemId === "addLinkContextMenu") {
//         const data = {
//             title: '',
//             url: info.linkUrl,
//             tags: '',
//             comment: ''
//         }
//         await createRecord('video', data)
//     }
// })

/****************************** Keyboard shortcuts ******************************/

// chrome.commands.onCommand.addListener(async function (command) {
//     console.log('Keyboard shortcut activated', command)
//     if (command === 'create_article') {
//         const data = {
//             title: currentSelection,
//             url: '',
//             tags: '',
//             comment: ''
//         }
//         console.log(data)
//         await createRecord('article', data)
//     } else if (command === 'create_video') {
//         const data = {
//             title: '',
//             url: currentSelection,
//             tags: '',
//             comment: ''
//         }
//         console.log(data)
//         await createRecord('video', data)
//     }
// });

/****************************** Misc ******************************/

async function createRecord(data) {
    const screenshotPromise = new Promise(function(resolve) {
        chrome.storage.local.get(["screenshot"], function(data) {
            resolve(data.screenshot)
        })
    })
    const screenshot = await screenshotPromise
    const url = 'http://localhost:8000/create_record'
    const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify({...data, screenshot}),
    });
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        const activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, { message: 'clearSelection' });
    });
    return await res.json();
}

// async function test(){
//     // const cookie = await chrome.cookies.getAll({})
//     const cookies = await chrome.cookies.getAll({domain: 'localhost'})
//     console.log(cookies)
//     // informationContainer.textContent = cookies[0].value
//     // informationContainer.textContent = 123
// }
// test()


chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    if (request.message === "createRecord") {
        console.log(request)
        const result = await createRecord(request.data)
        console.log(result)
        chrome.runtime.sendMessage({
            message: 'recordCreated',
            //data: {success: true}
            data: result
        });
    } else if (request.message === "currentSelection") {
        currentSelection = request.data;
    } else if (request.message === "getScreenshot") {
        chrome.tabs.captureVisibleTab(null, null, function(dataUrl) {
            chrome.storage.local.set({ screenshot:dataUrl })
            //console.log(dataUrl)
            //sendResponse({ screenshotUrl: dataUrl });
        });
    }
});
