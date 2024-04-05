const sidebarMenu = document.querySelector(".sidebar_menu");
const contentContainer = document.querySelector(".content");

const recordControlsTemplate = document.querySelector(".record_controls_template")
const recycleBinControlsTemplate = document.querySelector(".recycle_bin_controls_template")
const editableTemplate = document.querySelector(".editable_template")
const nonEditableTemplate = document.querySelector(".non-editable_template")
let currentPage = 1

function showMessage(messageContainer, messageText) { // Вывод сообщения
  messageContainer.textContent = messageText;
  setTimeout(function () {
    messageContainer.textContent = "";
  }, 1500);
}

async function buttonsContainerHandler(event, messageContainer, container) {
  const recordId = event.target.parentElement.parentElement.dataset.recordId;
  const contentCategory = event.target.parentElement.parentElement.dataset.contentCategory;
  const messageText = event.target.dataset.msg;
  const url = "/" + event.target.className;
  console.log(url);

  if (event.target.className === "add_to_favorites") { // Обработчики на кнопки
    handlePostRequest(url, recordId, contentCategory, function() {
      toggleFavoritesButton(event.target, true)
      showMessage(messageContainer, messageText);
    })
    updateRecordsContainer()

  } else if (event.target.className === "remove_from_favorites") { 
    if (getActiveItem() === "favorites") {
      event.target.parentElement.parentElement.remove()
    }
    handlePostRequest(url, recordId, contentCategory, function() {
      toggleFavoritesButton(event.target, false)
      showMessage(messageContainer, messageText);
    })
    updateRecordsContainer()

  } else if (event.target.className === "move_to_recycle_bin") {
    handlePostRequest(url, recordId, contentCategory, function() {
      event.target.parentElement.parentElement.remove()
      showMessage(messageContainer, messageText);
    })
    updateRecordsContainer()

  } else if (event.target.className === "restore_from_recycle_bin") {
    handlePostRequest(url, recordId, contentCategory, function() {
      event.target.parentElement.parentElement.remove()
      showMessage(messageContainer, messageText);
    })
    updateRecordsContainer()

  } else if (event.target.className === "add_tag") {
    handleButtonWithDialog(event, container, async function (currentEvent) {
      const dialogContainer = currentEvent.target.parentElement
      event.target.classList.remove("active_item")
      const tags = dialogContainer.children[0].value.trim().split(",")
      //const tags = value.split(/,\s*/).split(";").split(/;\s*/).split(" ")
      if (tags.length === 0) {
        return;
      }
      const data = {
        recordId,
        tags,
        contentCategory
      };
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
      });
      const result = await res.json();
      console.log(result)
      if (result.success) {
        showMessage(messageContainer, messageText);
        const tagsContainer = document.querySelector(".tags_container")
        if (tagsContainer) {
          for (const tag of tags) {
            const tagContainer = document.createElement("div")
            tagContainer.textContent = tag
            tagsContainer.append(tagContainer)
          }
        }
      }
      dialogContainer.remove();
    })

    /*
      TODO: Что делать, если success - false?
    */
  } else if (event.target.className === "delete_record") {
    handleButtonWithDialog(event, container, async function (currentEvent) {
      event.target.classList.remove("active_item")
      const dialogContainer = currentEvent.target.parentElement
      const data = { recordId, contentCategory }
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        dialogContainer.remove();
        container.parentElement.remove();
        showMessage(messageContainer, messageText);
      }
    })
    updateRecordsContainer()

  } else if (event.target.className === "edit_title") {
    handleButtonWithDialog(event, container, async function (currentEvent) {
      event.target.classList.remove("active_item")
      const dialogContainer = currentEvent.target.parentElement
      const title = dialogContainer.children[0].value.trim()
      if (title === "") {
        return;
      }
      const data = {
        recordId,
        title,
        contentCategory
      };
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        container.parentElement.firstChild.nextSibling.textContent = title;
        showMessage(messageContainer, messageText);
      }
      dialogContainer.remove();
    })
  } else if (event.target.className === "share_record") {
    const parentContainer = event.target.parentElement.parentElement
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(recordId),
    });
    const result = await res.json();
    console.log(result)
    if (result.success) {
      const clone = editableTemplate.content.firstElementChild.cloneNode(true);
      clone.children[0].value = `http://localhost:8000/link-${result.link}`
      clone.children[1].textContent = "Скопировать"
      clone.children[1].onclick = function() {
        clone.children[0].select()
        navigator.clipboard.writeText(clone.children[0].value)
        parentContainer.lastElementChild.remove()
      }
      clone.children[2].onclick = function() {
        parentContainer.lastElementChild.remove()
      }
      parentContainer.append(clone)
    } else {

    }
  } else if (event.target.className === "attach_file") {
    for(const elem of event.target.parentElement.children) {
      if (elem.classList.contains("active_item")) {
        return
      }
    }
    event.target.classList.add("active_item")
    const attachFileContainer = document.createElement("div");
    container.parentElement.append(attachFileContainer);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.accept = ".jpg, .jpeg, .png, .pdf, .doc, .docx, .txt";
    attachFileContainer.append(fileInput);

    fileInput.onchange = async function () {
      console.log(fileInput.files);
      const data = new FormData();
      for (const file of fileInput.files) {
        data.append("files", file, file.name);
      }
      const res = await fetch("/attach_file", {
        method: "POST",
        //headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: data,
      });
      const result = await res.json();
      if (result.success) {
        attachFileContainer.remove();
        event.target.classList.remove("active_item")
        showMessage(messageContainer, messageText);
      }
    };

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Отмена";
    attachFileContainer.append(cancelButton);

    cancelButton.onclick = async function () {
      attachFileContainer.remove();
      event.target.classList.remove("active_item")
    };
  }
};

function toggleFavoritesButton(btn, prop) {
  if (prop) {
    btn.textContent = "Удалить из избранного"
    btn.className = "remove_from_favorites"
    btn.dataset.msg = "Запись успешно удалена из избранного"
  } else {
    btn.textContent = "Добавить в избранное"
    btn.className = "add_to_favorites"
    btn.dataset.msg = "Запись успешно добавлена в избранное"
  }
}

function createButtons(type, messageContainer, record) {
  let template
  if (type === "recordControls") {
    template = document.querySelector(".record_controls_template")
  } else if (type === "recycleBinControls") {
    template = document.querySelector(".recycle_bin_controls_template")
  }

  const buttonsContainer = template.content.firstElementChild.cloneNode(true);
  const activeItem = getActiveItem();
  const favoritesButton = buttonsContainer.querySelector(".add_to_favorites")
  if (activeItem !== "recycle_bin") {
    toggleFavoritesButton(favoritesButton, record.favorites)
  }
  if (activeItem === "favorites") {
    favoritesButton.textContent = "Удалить из избранного"
  }

  buttonsContainer.onclick = function(event){
    buttonsContainerHandler(event, messageContainer, buttonsContainer)
  }

  return buttonsContainer
}

function getRecordById(records, recordId) {
  for (const record of records) {
    if (record.id == recordId) {
      return record;
    }
  }
}

function buildContent(recordsContainer, records) {
  console.log(records)
  contentContainer.append(recordsContainer);

  const messageContainer = document.createElement("div");
  messageContainer.className = "message_container";

  const recordsOnPage = 3;
  if (records.length > recordsOnPage) {
    populateRecordsContainer(recordsContainer, records.slice(0, recordsOnPage), messageContainer);
    const paginationTemplate = document.querySelector(".pagination_template")
    const paginationContainer = paginationTemplate.content.firstElementChild.cloneNode(true)
    contentContainer.append(paginationContainer)
    const pagesCount = Math.ceil(records.length / recordsOnPage)
    const currentPageContainer = paginationContainer.querySelector(".current_page")
    paginationContainer.querySelector(".pages_count").textContent = pagesCount
    paginationContainer.querySelector(".previous").classList.add("hidden")
    paginationContainer.querySelector(".first").classList.add("hidden")

    paginationContainer.onclick = function(event) {
      if (event.target.tagName !== "BUTTON") {
        return
      }
      let activePage = Number(currentPageContainer.textContent)
      if (event.target.className === "first") {
        activePage = 1
      } else if (event.target.className === "last") {
        activePage = pagesCount
      } else if (event.target.className === "previous") {
        activePage--
      } else if (event.target.className === "next") {
        activePage++
      }
      populateRecordsContainer(recordsContainer, records.slice(recordsOnPage * (activePage - 1), recordsOnPage * activePage), messageContainer);
      currentPageContainer.textContent = activePage
      if (activePage === 1) {
        paginationContainer.querySelector(".previous").classList.add("hidden")
        paginationContainer.querySelector(".first").classList.add("hidden")
      } else {
        paginationContainer.querySelector(".previous").classList.remove("hidden")
        paginationContainer.querySelector(".first").classList.remove("hidden")
      }
      if (activePage === pagesCount) {
        paginationContainer.querySelector(".last").classList.add("hidden")
        paginationContainer.querySelector(".next").classList.add("hidden")
      } else {
        paginationContainer.querySelector(".last").classList.remove("hidden")
        paginationContainer.querySelector(".next").classList.remove("hidden")
      }
    }
  } else {
    populateRecordsContainer(recordsContainer, records, messageContainer);
  }

  contentContainer.append(messageContainer);
}

function buildRecordDetails(record) {
  const recordDetailsContainer = document.createElement("div");
  recordDetailsContainer.dataset.recordId = record.id;
  recordDetailsContainer.dataset.contentCategory = record.content_category;
  contentContainer.append(recordDetailsContainer);
  const messageContainer = document.createElement("div");
  messageContainer.className = "message_container";
  contentContainer.append(messageContainer);

  const imageContainer = document.createElement("img");
  imageContainer.src = `screenshots/${record.id}.jpeg`;
  imageContainer.width = 250
  const titleContainer = document.createElement("div");
  titleContainer.textContent = record.title;
  const link = document.createElement("a");
  link.textContent = "Открыть ссылку";
  link.href = record.url
  link.target = "blank"
  const getSummaryButton = document.createElement("button")
  getSummaryButton.className = "get_summary"
  getSummaryButton.textContent = "Открыть описание"
  getSummaryButton.onclick = async function() {
    summaryContainer.classList.remove("hidden")
    getSummaryButton.classList.add("hidden")
    const response = await fetch("/get_summary", {
      method: "POST",
      body: record.content
    })
    const result = await response.json()
    console.log(result)
    if (result.success) {
      summaryContainer.textContent = result.data
    } else {
      summaryContainer.textContent = result.msg
    }
  }
  const summaryContainer = document.createElement("div")
  summaryContainer.classList.add("hidden")
  summaryContainer.textContent = "Описание загружается..."
  const tagsContainer = document.createElement("div");
  tagsContainer.className = "tags_container"

  for (const tag of record.tags) {
    const tagElement = document.createElement("div");
    tagElement.textContent = tag;
    tagsContainer.append(tagElement);
  }

  const commentContainer = document.createElement("div")
  commentContainer.textContent = record.comment

  const buttonsContainer = createButtons("recordControls", messageContainer, record)
  recordDetailsContainer.append(imageContainer);
  recordDetailsContainer.append(titleContainer);
  recordDetailsContainer.append(link);
  recordDetailsContainer.append(getSummaryButton);
  recordDetailsContainer.append(summaryContainer);
  recordDetailsContainer.append(tagsContainer);
  recordDetailsContainer.append(commentContainer);
  recordDetailsContainer.append(buttonsContainer);
}

function buildRecycleBin(recordsContainer, records) {
  console.log(records);
  contentContainer.append(recordsContainer);
  const messageContainer = document.createElement("div");
  const recordIds = []

  for (const record of records) {
    const recordContainer = document.createElement("div");
    recordContainer.dataset.recordId = record.id;
    recordIds.push({recordId: record.id, contentCategory: record.content_category})
    recordContainer.dataset.contentCategory = record.content_category;
    const imageContainer = document.createElement("div");
    imageContainer.textContent = "Картинка";
    const titleContainer = document.createElement("div");
    titleContainer.textContent = record.title;
    titleContainer.onclick = function (event) {
      const recordId = event.target.parentElement.dataset.recordId;
      contentContainer.innerHTML = "";
      const record = getRecordById(records, recordId);
      buildRecordDetails(record);
    };

    const buttonsContainer = createButtons("recycleBinControls", messageContainer, record)
    recordContainer.append(imageContainer);
    recordContainer.append(titleContainer);
    recordContainer.append(buttonsContainer);
    recordsContainer.append(recordContainer);
  }
  if (recordsContainer.childElementCount > 1) {
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "controls_container";
    contentContainer.append(controlsContainer);

    const deleteAllButton = document.createElement("button");
    deleteAllButton.textContent = "Удалить все";
    deleteAllButton.className = "delete_all_button";
    controlsContainer.append(deleteAllButton)
    deleteAllButton.onclick = async function() {
      const response = await fetch("/delete_records", {
        method: "POST",
        body: JSON.stringify(recordIds)
      });
      const result = await response.json()
      if (result.success) {
        showMessage(messageContainer, "Все записи успешно удалены")
        recordsContainer.remove()
        controlsContainer.remove()
      } else {
        console.log(result.msg)
      }
    }

    const restoreAllButton = document.createElement("button");
    restoreAllButton.textContent = "Восстановить все";
    restoreAllButton.className = "restore_all_button";
    controlsContainer.append(restoreAllButton)
    restoreAllButton.onclick = async function() {
      const response = await fetch("/restore_records", {
        method: "POST",
        body: JSON.stringify(recordIds)
      });
      const result = await response.json()
      if (result.success) {
        showMessage(messageContainer, "Все записи успешно восстановлены")
        recordsContainer.remove()
        controlsContainer.remove()
      } else {
        console.log(result.msg)
      }
    }
  }

  messageContainer.className = "message_container";
  contentContainer.append(messageContainer);

}

sidebarMenu.onclick = async function (event) {
  if (event.target === sidebarMenu) {
    return;
  }

  for (const menuItem of sidebarMenu.children) {
    menuItem.classList.remove("active_item");
  }

  event.target.classList.add("active_item");
  const contentCategory = getActiveItem();

  if (contentCategory === "records") { // Обработчики на вкладки
    handleGetRequest("records", "filter=all", buildContent)

  } else if (contentCategory === "tags") {
    const response = await fetch("/tags");
    const result = await response.json();
    if (result.success) {
      contentContainer.innerHTML = "";
      const tagsWrapperTemplate = document.querySelector(".tags_wrapper_template")
      const myTagsWrapper = tagsWrapperTemplate.content.firstElementChild.cloneNode(true)
      const tagsContainer = myTagsWrapper.querySelector(".tags_container")
      myTagsWrapper.querySelector("button.search").onclick = async function() {
        const input = myTagsWrapper.querySelector(".search_box input")
        const url = `/find_tag?tag=${input.value}`
        input.value = ""
        const response = await fetch(url);
        const result = await response.json();
        if (result.success) {
          tagsContainer.innerHTML = ""
          for (const tag of result.data) {
            const div = document.createElement("div");
            tagsContainer.append(div);
            div.textContent = tag;
          }
        }
      }
      contentContainer.append(myTagsWrapper);
      for (const tag of result.data) {
        const div = document.createElement("div");
        tagsContainer.append(div);
        div.textContent = tag;
      }
      tagsContainer.onclick = async function(event) {
        if (event.target === myTagsWrapper) {
          return
        }
        const tag = encodeURI(event.target.textContent)
        console.log(event.target)
        const url = `/records?filter=tags&tag=${tag}`
        console.log(url)
        const response = await fetch(url);
        const result = await response.json();
        if (result.success) {
          myTagsWrapper.remove()
          const container = document.createElement("div")
          buildContent(container, result.data)
          for (const record of container.children) {
            record.lastElementChild.remove()
          }
        }
      }
    }

  } else if (contentCategory === "articles") {
    handleGetRequest("articles", null, buildContent)

  } else if (contentCategory === "videos") {
    handleGetRequest("videos", null, buildContent)

  } else if (contentCategory === "favorites") {
    handleGetRequest("favorites", null, buildContent)

  } else if (contentCategory === "recycle_bin") {
    handleGetRequest("recycle_bin", null, buildContent)
  }
};

/************************************************************HELPERS*******************************************************/

async function handleGetRequest(route, queryString, cb) {
  const className = route + "_container"
  route = "/" + route
  if (queryString) {
    route += "?" + queryString
  }
  const response = await fetch(route);
  const result = await response.json();
  console.log(result.data)
  if (result.success) {
    contentContainer.innerHTML = "";
    const articlesContainer = document.createElement("div");
    articlesContainer.className = className;
    cb(articlesContainer, result.data);
  }
}

async function handlePostRequest(url, recordId, contentCategory, cb) {
  const data = {
    recordId,
    contentCategory
  };
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (result.success) {
    cb()
  }
}

const buttonsWithDialog = {
  "add_tag": () => [editableTemplate, "Добавьте теги"],
  "delete_record": () => [nonEditableTemplate, null],
  "edit_title": () => [editableTemplate, "Введите новое название"]
}

function handleButtonWithDialog(event, container, okButtonHandler) {
  for(const elem of event.target.parentElement.children) {
    if (elem.classList.contains("active_item")) {
      return
    }
  }
  let [template, placeholder] = buttonsWithDialog[event.target.className]()
  event.target.classList.add("active_item")
  const clone = template.content.firstElementChild.cloneNode(true);
  if (placeholder) {
    clone.children[0].placeholder = placeholder;
  }
  clone.children[clone.childElementCount - 2].onclick = okButtonHandler
  clone.children[clone.childElementCount - 1].onclick = async function (currentEvent) {
    event.target.classList.remove("active_item")
    currentEvent.target.parentElement.remove();
  }
  container.parentElement.append(clone);
}

function getActiveItem() {
  const currentSidebarItem = document.querySelector(".sidebar_menu .active_item");
  currentSidebarItem.classList.remove("active_item");
  const contentCategory = currentSidebarItem.className;
  currentSidebarItem.classList.add("active_item");
  return contentCategory;
}

window.onload = async function() {
  handleGetRequest("records", "filter=all", buildContent)
}

function populateRecordsContainer(recordsContainer, records, messageContainer) {
  recordsContainer.innerHTML = ""
  for (const record of records) {
    const recordContainer = document.createElement("div");
    recordContainer.dataset.recordId = record.id;
    recordContainer.dataset.contentCategory = record.record_type;
    const imageContainer = document.createElement("img");
    imageContainer.src = `screenshots/${record.id}.jpeg`;
    imageContainer.width = 250
    imageContainer.alt = "Картинка отсутствует"
    const titleContainer = document.createElement("div");
    titleContainer.textContent = record.title;

    titleContainer.onclick = async function (event) {
      const recordId = event.target.parentElement.dataset.recordId;
      contentContainer.innerHTML = "";
      //const record = getRecordById(records, recordId);
      const response = await fetch(`/get_record?id=${recordId}`);
      const result = await response.json()
      if (result.success) {
        console.log(result)
        buildRecordDetails(result.data);
      } else {
        console.log(result.msg)
      }
    };

    const buttonsContainer = createButtons("recordControls", messageContainer, record)
    recordContainer.append(imageContainer);
    recordContainer.append(titleContainer);
    recordContainer.append(buttonsContainer);
    recordsContainer.append(recordContainer);
  }
}

function updateRecordsContainer() {
  if (contentContainer.childElementCount < 3) {
    return
  }
  console.log("updateRecordsContainer")
}

/************************************************************LOGOUT*******************************************************/

const logoutButton = document.querySelector(".logout")
logoutButton.onclick = async function() {
  const response = await fetch("/logout");
  const result = await response.json();

  if (result.success) {
    location.href = "/login.html"
  } else {
    console.log(result)
  }
}