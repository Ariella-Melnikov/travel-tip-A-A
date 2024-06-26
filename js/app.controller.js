import { utilService } from "./services/util.service.js"
import { locService } from "./services/loc.service.js"
import { mapService } from "./services/map.service.js"

window.onload = onInit

// To make things easier in this project structure
// functions that are called from DOM are defined on a global app object
window.app = {
  onRemoveLoc,
  onUpdateLoc,
  onSelectLoc,
  onPanToUserPos,
  onSearchAddress,
  onCopyLoc,
  onShareLoc,
  onSetSortBy,
  onSetFilterBy,
  onChangeTheme,
  onSubmit,
  onCloseModal,
}

function onInit() {
  getFilterByFromQueryParams()
  loadAndRenderLocs()
  mapService
    .initMap()
    .then(() => {
      // onPanToTokyo()
      mapService.addClickListener((res) => {
        onAddLoc(res)
      })
    })
    .catch((err) => {
      console.error("OOPs:", err)
      flashMsg("Cannot init map")
    })
}

function renderLocs(locs) {
  const selectedLocId = getLocIdFromQueryParams()

  var strHTML = locs
    .map((loc) => {
      const className = loc.id === selectedLocId ? "active" : ""
      return `
        <li class="loc ${className}" data-id="${loc.id}">
            <h4>  
                <span>${loc.name}</span>
                <span title="${loc.rate} stars">${"★".repeat(loc.rate)}</span>
            </h4>
            <p class="muted">
                Created: ${utilService.elapsedTime(loc.createdAt)}
                ${
                  loc.createdAt !== loc.updatedAt
                    ? ` | Updated: ${utilService.elapsedTime(loc.updatedAt)}`
                    : ""
                }
            </p>
            <div class="loc-btns">     
               <button title="Delete" onclick="app.onRemoveLoc('${
                 loc.id
               }')">🗑️</button>
               <button title="Edit" onclick="app.onUpdateLoc('${
                 loc.id
               }')">✏️</button>
               <button title="Select" onclick="app.onSelectLoc('${
                 loc.id
               }')">🗺️</button>
            </div>     
        </li>`
    })
    .join("")

  const elLocList = document.querySelector(".loc-list")
  elLocList.innerHTML = strHTML || "No locs to show"

  renderLocStats()
  renderLastUpdatedPieChart(locs)

  if (selectedLocId) {
    const selectedLoc = locs.find((loc) => loc.id === selectedLocId)
    displayLoc(selectedLoc)
  }
  document.querySelector(".debug").innerText = JSON.stringify(locs, null, 2)
}

function onRemoveLoc(locId) {
  const confirmation = confirm("Are you sure?")
  if (confirmation)
    locService
      .remove(locId)
      .then(() => {
        flashMsg("Location removed")
        unDisplayLoc()
        loadAndRenderLocs()
      })
      .catch((err) => {
        console.error("OOPs:", err)
        flashMsg("Cannot remove location")
      })
}

function onSearchAddress(ev) {
  ev.preventDefault()
  const el = document.querySelector("[name=address]")
  mapService
    .lookupAddressGeo(el.value)
    .then((geo) => {
      mapService.panTo(geo)
    })
    .catch((err) => {
      console.error("OOPs:", err)
      flashMsg("Cannot lookup address")
    })
}

function onAddLoc(geo) {
  console.log(geo)
  const elModal = document.querySelector(".modal")
  const title = document.querySelector(".modal-title")

  title.innerText = "Add Location"

  elModal.dataset.geo = JSON.stringify(geo)
  elModal.showModal()
}

function onSubmit(ev) {
  ev.preventDefault()

  const elModal = document.querySelector(".modal")
  const locName = document.querySelector(".name-input").value
  const rate = document.querySelector(".rate-input").value
  const geo = JSON.parse(elModal.dataset.geo)
  const locId = elModal.dataset.locId
  console.log("geo", geo)

  if (!locName || !rate) {
    flashMsg("Name and rate are required.")
    return
  }

  const loc = {
    name: locName,
    rate,
    geo,
  }

  if (locId) {
    loc.id = locId
  }

  locService
    .save(loc)
    .then((savedLoc) => {
      elModal.close()
      flashMsg(`Added Location (id: ${savedLoc.id})`)
      utilService.updateQueryParams({ locId: savedLoc.id })
      loadAndRenderLocs()
    })
    .catch((err) => {
      console.error("OOPs:", err)
      flashMsg("Cannot add location")
    })
}

function onCloseModal() {
  const elModal = document.querySelector(".modal")
  elModal.querySelector(".name-input").value = ''
  elModal.querySelector(".rate-input").value = ''
  delete elModal.dataset.locId
  elModal.close()
  console.log("closed")
}

function onUpdateLoc(locId) {
  locService
    .getById(locId)
    .then((loc) => {
      const elModal = document.querySelector(".modal")
      const title = elModal.querySelector(".modal-title")

      title.innerText = "Update Location"
      elModal.querySelector(".name-input").value = loc.name
      elModal.querySelector(".rate-input").value = loc.rate

      elModal.dataset.geo = JSON.stringify(loc.geo)
      elModal.dataset.locId = loc.id

      elModal.showModal()
    })
    .catch((err) => {
      console.error("OOPs:", err)
      flashMsg("Cannot load location")
    })
}

function loadAndRenderLocs() {
  locService
    .query()
    .then(renderLocs)
    .catch((err) => {
      console.error("OOPs:", err)
      flashMsg("Cannot load locations")
    })
}

function onPanToUserPos() {
  mapService
    .getUserPosition()
    .then((latLng) => {
      mapService.panTo({ ...latLng, zoom: 15 })
      unDisplayLoc()
      loadAndRenderLocs()
      flashMsg(`You are at Latitude: ${latLng.lat} Longitude: ${latLng.lng}`)
    })
    .catch((err) => {
      console.error("OOPs:", err)
      flashMsg("Cannot get your position")
    })
}

function onSelectLoc(locId) {
  return locService
    .getById(locId)
    .then(displayLoc)
    .catch((err) => {
      console.error("OOPs:", err)
      flashMsg("Cannot display this location")
    })
}

function displayLoc(loc) {
  document.querySelector(".loc.active")?.classList?.remove("active")
  document.querySelector(`.loc[data-id="${loc.id}"]`).classList.add("active")

  mapService.panTo(loc.geo)
  mapService.setMarker(loc)

  const el = document.querySelector(".selected-loc")
  el.querySelector(".loc-name").innerText = loc.name
  el.querySelector(".loc-address").innerText = loc.geo.address
  el.querySelector(".loc-rate").innerHTML = "★".repeat(loc.rate)
  el.querySelector("[name=loc-copier]").value = window.location
  el.classList.add("show")

  utilService.updateQueryParams({ locId: loc.id })
}

function unDisplayLoc() {
  utilService.updateQueryParams({ locId: "" })
  document.querySelector(".selected-loc").classList.remove("show")
  mapService.setMarker(null)
}

function onCopyLoc() {
  const elCopy = document.querySelector("[name=loc-copier]")
  elCopy.select()
  elCopy.setSelectionRange(0, 99999) // For mobile devices
  navigator.clipboard.writeText(elCopy.value)
  flashMsg("Link copied, ready to paste")
}

function onShareLoc() {
  const url = document.querySelector("[name=loc-copier]").value

  // title and text not respected by any app (e.g. whatsapp)
  const data = {
    title: "Cool location",
    text: "Check out this location",
    url,
  }
  navigator.share(data)
}

function flashMsg(msg) {
  const el = document.querySelector(".user-msg")
  el.innerText = msg
  el.classList.add("open")
  setTimeout(() => {
    el.classList.remove("open")
  }, 3000)
}

function getFilterByFromQueryParams() {
  const queryParams = new URLSearchParams(window.location.search)
  const txt = queryParams.get("txt") || ""
  const minRate = queryParams.get("minRate") || 0
  locService.setFilterBy({ txt, minRate })

  document.querySelector('input[name="filter-by-txt"]').value = txt
  document.querySelector('input[name="filter-by-rate"]').value = minRate
}

function getLocIdFromQueryParams() {
  const queryParams = new URLSearchParams(window.location.search)
  const locId = queryParams.get("locId")
  return locId
}

function onSetSortBy() {
  const prop = document.querySelector(".sort-by").value
  const isDesc = document.querySelector(".sort-desc").checked

  if (!prop) return

  const sortBy = {}
  sortBy[prop] = isDesc ? -1 : 1

  // Shorter Syntax:
  // const sortBy = {
  //     [prop] : (isDesc)? -1 : 1
  // }

  locService.setSortBy(sortBy)
  loadAndRenderLocs()
}

function onSetFilterBy({ txt, minRate }) {
  const filterBy = locService.setFilterBy({ txt, minRate: +minRate })
  utilService.updateQueryParams(filterBy)
  loadAndRenderLocs()
}

function renderLocStats() {
  locService.getLocCountByRateMap().then((stats) => {
    handleStats(stats, "loc-stats-rate")
  })
}

function handleStats(stats, selector) {
  // stats = { low: 37, medium: 11, high: 100, total: 148 }
  // stats = { low: 5, medium: 5, high: 5, baba: 55, mama: 30, total: 100 }
  const labels = cleanStats(stats)
  const colors = utilService.getColors()

  var sumPercent = 0
  var colorsStr = `${colors[0]} ${0}%, `
  labels.forEach((label, idx) => {
    if (idx === labels.length - 1) return
    const count = stats[label]
    const percent = Math.round((count / stats.total) * 100, 2)
    sumPercent += percent
    colorsStr += `${colors[idx]} ${sumPercent}%, `
    if (idx < labels.length - 1) {
      colorsStr += `${colors[idx + 1]} ${sumPercent}%, `
    }
  })

  colorsStr += `${colors[labels.length - 1]} ${100}%`
  // Example:
  // colorsStr = `purple 0%, purple 33%, blue 33%, blue 67%, red 67%, red 100%`

  const elPie = document.querySelector(`.${selector} .pie`)
  const style = `background-image: conic-gradient(${colorsStr})`
  elPie.style = style

  const ledendHTML = labels
    .map((label, idx) => {
      return `
                <li>
                    <span class="pie-label" style="background-color:${colors[idx]}"></span>
                    ${label} (${stats[label]})
                </li>
            `
    })
    .join("")

  const elLegend = document.querySelector(`.${selector} .legend`)
  elLegend.innerHTML = ledendHTML
}

function cleanStats(stats) {
  const cleanedStats = Object.keys(stats).reduce((acc, label) => {
    if (label !== "total" && stats[label]) {
      acc.push(label)
    }
    return acc
  }, [])
  return cleanedStats
}

function classifyByLastUpdated(locs) {
  return new Promise((resolve, reject) => {
    try {
      const now = Date.now()
      const oneDayMs = 24 * 60 * 60 * 1000

      const today = []
      const past = []
      const never = []

      locs.forEach((loc) => {
        if (!loc.updatedAt || loc.updatedAt === loc.createdAt) {
          never.push(loc)
        } else if (now - loc.updatedAt < oneDayMs) {
          today.push(loc)
        } else {
          past.push(loc)
        }
      })

      resolve({ today, past, never })
    } catch (error) {
      reject(error)
    }
  })
}

function calculateStats(groups) {
  return new Promise((resolve, reject) => {
    try {
      const stats = {
        today: groups.today.length,
        past: groups.past.length,
        never: groups.never.length,
        total: groups.today.length + groups.past.length + groups.never.length,
      }
      resolve(stats)
    } catch (error) {
      reject(error)
    }
  })
}

function renderLastUpdatedPieChart(locs) {
  return classifyByLastUpdated(locs)
    .then((groups) => calculateStats(groups))
    .then((stats) => handleStats(stats, "last-updated-stats"))
    .catch((error) => console.error("Error rendering pie chart:", error))
}

function onChangeTheme() {
  console.log("theme selector")

  const mainContent = document.querySelector(".main-content")
  mainContent.classList.toggle("theme-alternate")

}

