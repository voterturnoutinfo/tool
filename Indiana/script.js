let currentMap, previousMap, countyBoundaries;
let voterData = [];
let selectedCounty = "Indiana"; // Default county is Indiana
let selectedElectionTypeCurrent = "General"; // For current year
let selectedElectionTypePrevious = "General"; // For previous year

// Fetch voter data and county boundaries
async function fetchData() {
    try {
        const [voterResponse, boundariesResponse] = await Promise.all([
            fetch('voterdata.json'),
            fetch('indianaCounties.geojson')
        ]);
        
        voterData = await voterResponse.json();
        countyBoundaries = await boundariesResponse.json();
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Function to color counties based on voter turnout
function getColor(turnout) {
    let turnoutPercent = parseFloat(turnout.replace('%', ''));
    
    if (turnoutPercent >= 35) return '#173e19'; // Darkest green
    if (turnoutPercent >= 30) return '#205723'; // Dark green
    if (turnoutPercent >= 25) return '#29702d'; // Medium green
    if (turnoutPercent >= 20) return '#428a46'; // Light green
    if (turnoutPercent >= 15) return '#6ca46f'; // Lighter green
    if (turnoutPercent >= 10) return '#96be98'; // Lightest green
    return '#c0d8c1'; // Very light green
}

// Get county data by year, county name, and election type
function getCountyData(year, countyName, electionType) {
    return voterData.find(record => 
        record.Year == year && 
        record.County === countyName && 
        record["Election Type"] === electionType
    );
}

// Initialize the maps
function initMaps() {
    // Current Year Map
    currentMap = L.map('current-year-map', {
        center: [39.8, -86.1349],
        zoom: 7,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
    });

    // Previous Year Map
    previousMap = L.map('previous-year-map', {
        center: [39.8, -86.1349],
        zoom: 7,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
    });

    // Add tile layer to both maps
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(currentMap);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(previousMap);

    // Disable any touch events or drag interactions
    currentMap.touchZoom.disable();
    currentMap.doubleClickZoom.disable();
    currentMap.boxZoom.disable();
    currentMap.keyboard.disable();

    previousMap.touchZoom.disable();
    previousMap.doubleClickZoom.disable();
    previousMap.boxZoom.disable();
    previousMap.keyboard.disable();

    // Function to add county boundaries to a map
    function addCountyBoundaries(map, year, electionType) {
        L.geoJSON(countyBoundaries, {
            style: function(feature) {
                const countyName = feature.properties.name;
                const countyData = getCountyData(year, countyName, electionType);

                return {
                    fillColor: countyData ? getColor(countyData["Turnout (%)"]) : '#c0d8c1',
                    weight: 1,
                    opacity: 1,
                    color: 'white',
                    fillOpacity: 0.7
                };
            },
            onEachFeature: function(feature, layer) {
                layer.on('click', function() {
                    highlightCounty(feature.properties.name);
                });
            }
        }).addTo(map);
    }

    // Add boundaries for current and previous years
    const currentYear = document.getElementById('current-year').value;
    const previousYear = document.getElementById('previous-year').value;

    addCountyBoundaries(currentMap, currentYear, selectedElectionTypeCurrent);
    addCountyBoundaries(previousMap, previousYear, selectedElectionTypePrevious);
}

// Display the county information in the info box
function displayCountyInfo(countyName) {
    const currentYear = document.getElementById('current-year').value;
    const previousYear = document.getElementById('previous-year').value;

    // Get current and previous data for the selected election type
    const currentData = getCountyData(currentYear, countyName, selectedElectionTypeCurrent);
    const previousData = getCountyData(previousYear, countyName, selectedElectionTypePrevious);

    // Display current year data
    const currentInfoDiv = document.getElementById('current-year-details');
    currentInfoDiv.innerHTML = `
        <h3>${countyName === "Indiana" ? 'Indiana' : `${countyName} County`}: ${currentYear}
        <div class="button-container">
        <button id="current-general-btn" class="toggle-button ${selectedElectionTypeCurrent === 'General' ? 'selected' : ''}">General</button>
        <button id="current-primary-btn" class="toggle-button ${selectedElectionTypeCurrent === 'Primary' ? 'selected' : ''}">Primary</button>
        </div></h3><br>
        <strong>Registered Voters:</strong> ${currentData ? currentData["Registered Voters"] : 'N/A'}<br>
        <strong>Voters Voting:</strong> ${currentData ? currentData["Voters Voting"] : 'N/A'}<br>
        <strong>Turnout (%):</strong> ${currentData ? currentData["Turnout (%)"] : 'N/A'}<br>
        <strong>Election Day Vote:</strong> ${currentData ? currentData["Election Day Vote"] : 'N/A'}<br>
        <strong>Absentee:</strong> ${currentData ? currentData["Absentee"] : 'N/A'}<br>
        <strong>Absentee (%):</strong> ${currentData ? currentData["Absentee (%)"] : 'N/A'}
    `;

    // Display previous year data
    const previousInfoDiv = document.getElementById('previous-year-details');
    previousInfoDiv.innerHTML = `
        <h3>${countyName === "Indiana" ? 'Indiana' : `${countyName} County`}: ${previousYear}
        <div class="button-container">
        <button id="previous-general-btn" class="toggle-button ${selectedElectionTypePrevious === 'General' ? 'selected' : ''}">General</button>
        <button id="previous-primary-btn" class="toggle-button ${selectedElectionTypePrevious === 'Primary' ? 'selected' : ''}">Primary</button>
        </div></h3><br>
        <strong>Registered Voters:</strong> ${previousData ? previousData["Registered Voters"] : 'N/A'}<br>
        <strong>Voters Voting:</strong> ${previousData ? previousData["Voters Voting"] : 'N/A'}<br>
        <strong>Turnout (%):</strong> ${previousData ? previousData["Turnout (%)"] : 'N/A'}<br>
        <strong>Election Day Vote:</strong> ${previousData ? previousData["Election Day Vote"] : 'N/A'}<br>
        <strong>Absentee:</strong> ${previousData ? previousData["Absentee"] : 'N/A'}<br>
        <strong>Absentee (%):</strong> ${previousData ? previousData["Absentee (%)"] : 'N/A'}
    `;

    // Calculate and display percent change if both data points exist
    if (currentData && previousData) {
        const registeredVotersChange = Intl.NumberFormat().format(parseInt(currentData["Registered Voters"].replace(/,/g, '')) - parseInt(previousData["Registered Voters"].replace(/,/g, '')));
        const votersVotingChange = Intl.NumberFormat().format(parseInt(currentData["Voters Voting"].replace(/,/g, '')) - parseInt(previousData["Voters Voting"].replace(/,/g, '')));
        const electionDayVoteChange = Intl.NumberFormat().format(parseInt(currentData["Election Day Vote"].replace(/,/g, '')) - parseInt(previousData["Election Day Vote"].replace(/,/g, '')));
        const absenteeChange = Intl.NumberFormat().format(parseInt(currentData["Absentee"].replace(/,/g, '')) - parseInt(previousData["Absentee"].replace(/,/g, '')));
        
        const registeredVotersPercentChange = (((parseInt(currentData["Registered Voters"].replace(/,/g, '')) / parseInt(previousData["Registered Voters"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const votersVotingPercentChange = (((parseInt(currentData["Voters Voting"].replace(/,/g, '')) / parseInt(previousData["Voters Voting"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const turnoutPercentChange = (((parseInt(currentData["Turnout (%)"].replace(/,/g, '')) / parseInt(previousData["Turnout (%)"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const electionDayVotePercentChange = (((parseInt(currentData["Election Day Vote"].replace(/,/g, '')) / parseInt(previousData["Election Day Vote"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const absenteePercentChange = (((parseInt(currentData["Absentee"].replace(/,/g, '')) / parseInt(previousData["Absentee"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const absenteePercentPercentChange = (((parseInt(currentData["Absentee (%)"].replace(/,/g, '')) / parseInt(previousData["Absentee (%)"].replace(/,/g, ''))) - 1) * 100).toFixed(2);

        document.getElementById('percent-change-details').innerHTML = `
            <h3>${countyName === "Indiana" ? 'Indiana' : `${countyName} County`}<br>
            ${previousYear} ${selectedElectionTypePrevious} to ${currentYear} ${selectedElectionTypeCurrent}</h3><br>
            <strong>Registered Voters (Percent Change):</strong> ${registeredVotersChange} (${registeredVotersPercentChange}%)<br>
            <strong>Voters Voting (Percent Change):</strong> ${votersVotingChange} (${votersVotingPercentChange}%)<br>
            <strong>Turnout Percent:</strong> ${turnoutPercentChange}%<br>
            <strong>Election Day Vote (Percent Change):</strong> ${electionDayVoteChange} (${electionDayVotePercentChange}%)<br>
            <strong>Absentee (Percent Change):</strong> ${absenteeChange} (${absenteePercentChange}%) <br>
            <strong>Absentee Percent Change:</strong> ${absenteePercentPercentChange}%<br>
        `;
    }

    // Attach event listeners to the buttons
    document.getElementById('current-general-btn').addEventListener('click', () => {
        selectedElectionTypeCurrent = "General";
        updateMap();
        displayCountyInfo(selectedCounty);
    });

    document.getElementById('current-primary-btn').addEventListener('click', () => {
        selectedElectionTypeCurrent = "Primary";
        updateMap();
        displayCountyInfo(selectedCounty);
    });

    document.getElementById('previous-general-btn').addEventListener('click', () => {
        selectedElectionTypePrevious = "General";
        updateMap();
        displayCountyInfo(selectedCounty);
    });

    document.getElementById('previous-primary-btn').addEventListener('click', () => {
        selectedElectionTypePrevious = "Primary";
        updateMap();
        displayCountyInfo(selectedCounty);
    });
}

// Highlight county function
function highlightCounty(countyName) {
    // Reset if same county is clicked
    if (selectedCounty === countyName) {
        selectedCounty = "Indiana";
        selectedElectionTypeCurrent = "General";
        selectedElectionTypePrevious = "General";
        updateMap();
        displayCountyInfo("Indiana");
        return;
    }

    // Redraw maps with highlighted county
    function updateCountyStyle(map, year, electionType) {
        map.eachLayer(layer => {
            if (layer instanceof L.GeoJSON) {
                layer.setStyle(function(feature) {
                    const currentName = feature.properties.name;
                    const isSelectedCounty = currentName === countyName;
                    const countyData = getCountyData(year, currentName, electionType);

                    return {
                        fillColor: countyData ? getColor(countyData["Turnout (%)"]) : '#c0d8c1',
                        weight: isSelectedCounty ? 3 : 1,
                        color: isSelectedCounty ? '#ffff00' : 'white',
                        fillOpacity: isSelectedCounty ? 0.9 : 0.7
                    };
                });
            }
        });
    }

    const currentYear = document.getElementById('current-year').value;
    const previousYear = document.getElementById('previous-year').value;

    updateCountyStyle(currentMap, currentYear, selectedElectionTypeCurrent);
    updateCountyStyle(previousMap, previousYear, selectedElectionTypePrevious);

    selectedCounty = countyName;
    displayCountyInfo(countyName);
}

// Update the maps when a new year is selected
function updateMap() {
    const currentYear = document.getElementById('current-year').value;
    const previousYear = document.getElementById('previous-year').value;

    // Remove existing layers
    currentMap.eachLayer(layer => {
        if (layer instanceof L.GeoJSON) {
            currentMap.removeLayer(layer);
        }
    });
    previousMap.eachLayer(layer => {
        if (layer instanceof L.GeoJSON) {
            previousMap.removeLayer(layer);
        }
    });

    // Reinitialize county boundaries with new years
    function addCountyBoundaries(map, year, electionType) {
        L.geoJSON(countyBoundaries, {
            style: function(feature) {
                const countyName = feature.properties.name;
                const countyData = getCountyData(year, countyName, electionType);
                const isSelectedCounty = countyName === selectedCounty;

                return {
                    fillColor: countyData ? getColor(countyData["Turnout (%)"]) : '#c0d8c1',
                    weight: isSelectedCounty ? 3 : 1,
                    color: isSelectedCounty ? '#ffff00' : 'white',
                    fillOpacity: isSelectedCounty ? 0.9 : 0.7
                };
            },
            onEachFeature: function(feature, layer) {
                layer.on('click', function() {
                    highlightCounty(feature.properties.name);
                });
            }
        }).addTo(map);
    }

    addCountyBoundaries(currentMap, currentYear, selectedElectionTypeCurrent);
    addCountyBoundaries(previousMap, previousYear, selectedElectionTypePrevious);

    // Keep the selected county's information displayed
    displayCountyInfo(selectedCounty);
}

// Initialize everything
document.addEventListener('DOMContentLoaded', async () => {
    await fetchData();
    initMaps();
    displayCountyInfo("Indiana");
});

// Event listeners for year changes
document.getElementById('current-year').addEventListener('change', updateMap);
document.getElementById('previous-year').addEventListener('change', updateMap);
