document.addEventListener("selectionchange", function (event) {
    const selection = window.getSelection()
    // let text = selection.anchorNode.textContent
    // text = text.slice(selection.baseOffset, selection.extentOffset)
    
    // console.log(selection.toString())

    // chrome.runtime.sendMessage({
    //     message: "currentSelection",
    //     data: selection.toString()
    // });
})

function highlight(text) {
    var inputText = document.getElementById("inputText");
    var innerHTML = inputText.innerHTML;
    var index = innerHTML.indexOf(text);
    if (index >= 0) {
        innerHTML = innerHTML.substring(0, index) + "<span class='highlight'>" + innerHTML.substring(index, index + text.length) + "</span>" + innerHTML.substring(index + text.length);
        inputText.innerHTML = innerHTML;
    }
}

document.oncontextmenu = function(event) {
    event.target.classList.add('highlight')
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if(request.message === "getSelection") {
            chrome.runtime.sendMessage({
                message: "currentSelection",
                data: window.getSelection().toString()
            });
        } else if(request.message === "clearSelection") {
            window.getSelection().empty()
        } else if(request.message === "getTitle") {
            chrome.runtime.sendMessage({
                message: "currentTitle",
                data: document.title
            });
        }
    }
);
