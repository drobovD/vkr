/****************************** Global variables ******************************/

const mainContainer = document.querySelector(".main-container");
const authenticationContainer = document.querySelector(
  ".authentication-container"
);
const informationContainer = document.querySelector(".information-container");
const username = document.querySelector(".username span");
const recordTypeContainer = document.querySelector(".record-type");
const titleInput = document.querySelector(".title");
const urlInput = document.querySelector(".url");
const contentInput = document.querySelector(".content");
const tagsContainer = document.querySelector(".tags");
const commentInput = document.querySelector(".comment");
const okButton = document.querySelector(".ok-button");
const cancelButton = document.querySelector(".cancel-button");
const errorMessageContainer = document.querySelector(".error-message");

/****************************** Event handlers ******************************/

// async function test(){
//     // const cookie = await chrome.cookies.getAll({})
//     const cookies = await chrome.cookies.getAll({domain: 'localhost'})
//     informationContainer.textContent = cookies[0].value
//     // informationContainer.textContent = 123
// }
// test()

window.onload = async function () {
  const res = await fetch("http://localhost:8000/test");
  const result = await res.json();
  // console.log(result)
  authenticationContainer.classList.add("hidden");
  if (result.success) {
    mainContainer.classList.remove("hidden");
    username.textContent = result.username;
    const tags = result.tags
    if (tags.length > 0) {
      tagsContainer.hidden = false
      if (tags.length > 3) {
        tagsContainer.size = 3
      } else {
        tagsContainer.size = tags.length
      }
      for (const tag of tags) {
        const option = document.createElement("option")
        option.textContent = tag
        option.value = tag
        tagsContainer.append(option)
      }
    }
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0];
      chrome.tabs.sendMessage(currentTab.id, { message: 'getTitle' });
      chrome.runtime.sendMessage({ message: 'getScreenshot' });
    });
  } else {
    informationContainer.classList.remove("hidden");
  }
};

// recordTypeContainer.onchange = function () {
//   const checkedRadioInput = recordTypeContainer.querySelector(
//     'input[name="record-type"]:checked'
//   );
//   if (checkedRadioInput.value === "article") {
//     titleInput.hidden = false;
//   } else {
//     titleInput.hidden = true;
//   }
//   errorMessageContainer.textContent = "";
// };

okButton.onclick = async function () {
  const checkedRadioInput = recordTypeContainer.querySelector(
    'input[name="record-type"]:checked'
  );
  if (checkedRadioInput.value === "article" && titleInput.value === "") {
    errorMessageContainer.textContent = "Заполните заголовок";
    return;
  }
  // if (urlInput.value === "") {
  //   errorMessageContainer.textContent = "Заполните URL";
  //   return;
  // }
  const tags = []
  for (const option of tagsContainer.children) {
    if (option.selected) {
      tags.push(option.value)
    }
  }
  const data = {
    type: checkedRadioInput.value,
    title: titleInput.value,
    url: urlInput.value,
    content: contentInput.value,
    tags,
    comment: commentInput.value,
  };
  console.log(data)
  chrome.runtime.sendMessage({
    message: "createRecord",
    data,
  });
};

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  console.log(request.message)
  if (request.message === "recordCreated") {
    const result = request.data;
    console.log(result);
    if (result.success) {
      window.close();
    }
  } else if (request.message === "currentSelection") {
    const currentSelection = request.data
    if (currentSelection === "") {
      return
    }
    try {
      new URL(currentSelection)
      urlInput.value = currentSelection
    } catch {
      contentInput.value = currentSelection
    }
    
    //commentInput.value = request.data
  } else if (request.message === "currentTitle") {
    console.log(request.data)
    titleInput.value = request.data
  }
});

cancelButton.onclick = function () {
  window.close();
};

/****************************** Misc ******************************/

const videoURLs = [
  "https://www.youtube.com/",
  "https://rutube.ru/",
  "https://vk.com/video",
  "https://dzen.ru/video",
].map((url) => new URL(url)); // Преобразование массива строк в массив объектов
console.log(videoURLs);
function checkVideoURL(currentTabURL) {
  const url = new URL(currentTabURL);
  for (const item of videoURLs) {
    if (item.origin === url.origin) {
      const pathComponent = url.pathname.split("/")[1]
      if (item.pathname === "/") {
        return true;
      } else {
        if (pathComponent === item.pathname.slice(1)) {
          return true;
        }
      }
    }
  }
  return false;
}

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const currentTab = tabs[0];
  chrome.tabs.sendMessage(currentTab.id, { message: 'getSelection' });
  urlInput.value = currentTab.url;
  if (checkVideoURL(currentTab.url)) {
    document.querySelector(".video_radio").checked = true
  }
});
