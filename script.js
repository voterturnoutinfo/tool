let mainMap; 
let icpsrData = []; 
let icpsrDataMap = {}; // Index for faster lookups
let countyBoundariesUSA; 
let selectedCountyFIPS = null;
let dataLoaded = false;
let mapInitialized = false;

const stateNames = {
        '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas',
        '06': 'California', '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware',
        '11': 'District of Columbia', '12': 'Florida', '13': 'Georgia', '15': 'Hawaii',
        '16': 'Idaho', '17': 'Illinois', '18': 'Indiana', '19': 'Iowa',
        '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine',
        '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota',
        '28': 'Mississippi', '29': 'Missouri', '30': 'Montana', '31': 'Nebraska',
        '32': 'Nevada', '33': 'New Hampshire', '34': 'New Jersey', '35': 'New Mexico',
        '36': 'New York', '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio',
        '40': 'Oklahoma', '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island',
        '45': 'South Carolina', '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas',
        '49': 'Utah', '50': 'Vermont', '51': 'Virginia', '53': 'Washington',
        '54': 'West Virginia', '55': 'Wisconsin', '56': 'Wyoming', '72': 'Puerto Rico'
    }; 

// --- Helper function to get a single record from ICPSR data using indexed lookup ---
function getNationalRecord(fipsCode, year) {
    const key = `${String(fipsCode).padStart(5, '0')}_${year}`;
    return icpsrDataMap[key];
}

// --- Build index for faster lookups ---
function buildDataIndex() {
    icpsrDataMap = {};
    for (let record of icpsrData) {
        const key = `${String(record.STCOFIPS10).padStart(5, '0')}_${record.YEAR}`;
        icpsrDataMap[key] = record;
    }
}

function getTurnoutChanges(fipsCode, currentYear, previousYear) {
    const currentRecord = getNationalRecord(fipsCode, currentYear);
    const previousRecord = getNationalRecord(fipsCode, previousYear);

    if (!currentRecord || !previousRecord) {
        return null;
    }

    // Calculate changes for all three metrics
    const voterTurnoutChange = currentRecord.VOTER_TURNOUT_PCT - previousRecord.VOTER_TURNOUT_PCT;
    const regVoterTurnoutChange = currentRecord.REG_VOTER_TURNOUT_PCT - previousRecord.REG_VOTER_TURNOUT_PCT;
    const regVotersPctChange = currentRecord.REG_VOTERS_PCT - previousRecord.REG_VOTERS_PCT;

    return {
        voterTurnout: voterTurnoutChange,
        regVoterTurnout: regVoterTurnoutChange,
        regVotersPct: regVotersPctChange
    };
}

function getTurnoutChange(fipsCode, currentYear, previousYear) {
    const currentRecord = getNationalRecord(fipsCode, currentYear);
    const previousRecord = getNationalRecord(fipsCode, previousYear);

    if (!currentRecord || !previousRecord) {
        return null;
    }

    // VOTER_TURNOUT_PCT is a decimal (e.g., 0.61)
    const currentTurnout = currentRecord.VOTER_TURNOUT_PCT;
    const previousTurnout = previousRecord.VOTER_TURNOUT_PCT;

    // Return the change in percentage points (e.g., 0.61 - 0.59 = 0.02)
    return currentTurnout - previousTurnout;
}

// --- Helper function to get color based on turnout change ---
function getChangeColor(change) {
    if (change === null) return '#c0d8c1'; // Default for no data

    // Convert change to percentage points
    const changePercent = change * 100;

    // Green for increase, Red for decrease, White/Gray for no change
    if (changePercent >= 5) return '#00441b'; // Strong Increase
    if (changePercent >= 2) return '#238b45'; // Moderate Increase
    if (changePercent >= 0.5) return '#a1d99b'; // Slight Increase
    if (changePercent > -0.5) return '#f7f7f7'; // Near Zero Change
    if (changePercent > -2) return '#fcae91'; // Slight Decrease
    if (changePercent > -5) return '#de2d26'; // Moderate Decrease
    return '#a50f15'; // Strong Decrease
}

// Fetch all data with optimized compressed files
async function fetchData() {
    try {
        // Show loading indicator
        const infoDiv = document.getElementById('county-details');
        infoDiv.innerHTML = '<p>Loading map data...</p>';
        
        // Use Promise.all for parallel loading
        const [icpsrResponse, usaBoundariesResponse] = await Promise.all([
            // Use compressed ICPSR data
            fetch('/tool/json/voterturnoutdata-ICPSR.json'),
            // Use simplified GeoJSON
            fetch('/tool/json/counties.geojson') 
        ]);
        
        if (!icpsrResponse.ok || !usaBoundariesResponse.ok) {
            throw new Error('Failed to fetch data files');
        }
        
        icpsrData = await icpsrResponse.json();
        countyBoundariesUSA = await usaBoundariesResponse.json();
        
        // Build index for faster lookups
        buildDataIndex();
        
        dataLoaded = true;
        initMap();

    } catch (error) {
        console.error("Error fetching data:", error);
        const infoDiv = document.getElementById('county-details');
        infoDiv.innerHTML = '<p style="color: red;">Error loading map data. Please refresh the page.</p>';
    }
}

// Initialize the map
function initMap() {
    if (mapInitialized) return;
    
    // --- 1. Initialize USA Map ---
    mainMap = L.map('main-map', { 
        center: [39.8, -98.5], // Center of the US
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: false, 
        boxZoom: true,
        keyboard: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mainMap);

    mapInitialized = true;
    
    // Initial draw of the map
    updateMap();

    // Event listeners for year selection
    document.getElementById('current-year').addEventListener('change', updateMap);
    document.getElementById('previous-year').addEventListener('change', updateMap);
}

function displayCountyInfo(fipsCode) {
    const currentYear = document.getElementById('current-year').value;
    const previousYear = document.getElementById('previous-year').value;
    const infoDiv = document.getElementById('county-details');
    
    if (!fipsCode) {
        infoDiv.innerHTML = `<h2>Click a County for Details</h2>
            <p>Map shows the percentage point change in Voter Turnout (VAP) between the selected years.</p>`;
        return;
    }

    const currentRecord = getNationalRecord(fipsCode, currentYear);
    const previousRecord = getNationalRecord(fipsCode, previousYear);
    const changes = getTurnoutChanges(fipsCode, currentYear, previousYear);

    // Get county and state names from GeoJSON
    const countyFeature = countyBoundariesUSA.features.find(f => 
        (f.properties.STATEFP + f.properties.COUNTYFP) === fipsCode
    );
    
    const countyName = countyFeature ? countyFeature.properties.NAME : 'Unknown';
    const stateFP = fipsCode.substring(0, 2); // First 2 digits are state FIPS
    
    const stateName = stateNames[stateFP] || 'Unknown';
    
    const currentTurnout = currentRecord ? (currentRecord.VOTER_TURNOUT_PCT * 100).toFixed(2) + '%' : 'N/A';
    const currentRegTurnout = currentRecord ? (currentRecord.REG_VOTER_TURNOUT_PCT * 100).toFixed(2) + '%' : 'N/A';
    const currentRegPct = currentRecord ? (currentRecord.REG_VOTERS_PCT * 100).toFixed(2) + '%' : 'N/A';
    const previousTurnout = previousRecord ? (previousRecord.VOTER_TURNOUT_PCT * 100).toFixed(2) + '%' : 'N/A';
    const previousRegTurnout = previousRecord ? (previousRecord.REG_VOTER_TURNOUT_PCT * 100).toFixed(2) + '%' : 'N/A';
    const previousRegPct = previousRecord ? (previousRecord.REG_VOTERS_PCT * 100).toFixed(2) + '%' : 'N/A';
    
    // Format changes
    const voterTurnoutChangeText = changes ? (changes.voterTurnout * 100).toFixed(2) + ' pp' : 'N/A';
    const regVoterTurnoutChangeText = changes ? (changes.regVoterTurnout * 100).toFixed(2) + ' pp' : 'N/A';
    const regVotersPctChangeText = changes ? (changes.regVotersPct * 100).toFixed(2) + ' pp' : 'N/A';

    infoDiv.innerHTML = `
        <h2>${countyName} County, ${stateName}</h2>
        
        <h3>Turnout Comparison</h3>
        <br>

        <p><strong>${previousYear}:</strong>
        &nbsp;&nbsp;• Percent of Voting Age Registered: ${previousRegPct}<br>
        &nbsp;&nbsp;• Voter Turnout (VAP): ${previousTurnout}<br>
        &nbsp;&nbsp;• Registered Voter Turnout: ${previousRegTurnout}</p>

        <p><strong>${currentYear}:</strong>
        &nbsp;&nbsp;• Percent of Voting Age Registered: ${currentRegPct}<br>
        &nbsp;&nbsp;• Voter Turnout (VAP): ${currentTurnout}<br>
        &nbsp;&nbsp;• Registered Voter Turnout: ${currentRegTurnout}</p>
        
        <p><strong>Change (${previousYear} to ${currentYear}):</strong>
        &nbsp;&nbsp;• Percent Registered: ${regVotersPctChangeText}<br>
        &nbsp;&nbsp;• Voter Turnout (VAP): ${voterTurnoutChangeText}<br>
        &nbsp;&nbsp;• Registered Voter Turnout: ${regVoterTurnoutChangeText}</p>
        <br>

        <h3>Partisan Index (${currentYear})</h3>
        <p><strong>Partisan Index (Dem):</strong> ${currentRecord ? (currentRecord.PARTISAN_INDEX_DEM * 100).toFixed(2) + '%' : 'N/A'}</p>
        <p><strong>Partisan Index (Rep):</strong> ${currentRecord ? (currentRecord.PARTISAN_INDEX_REP * 100).toFixed(2) + '%' : 'N/A'}</p>
    `;
}

// Highlight county function
function highlightCounty(fipsCode) {
    // Reset if same county is clicked
    if (selectedCountyFIPS === fipsCode) {
        selectedCountyFIPS = null;
        displayCountyInfo(null);
    } else {
        selectedCountyFIPS = fipsCode;
        displayCountyInfo(fipsCode);
    }
    updateMap();
}

// Update map function with debouncing for performance
let updateMapTimeout;
function updateMap() {
    // Debounce rapid updates
    clearTimeout(updateMapTimeout);
    updateMapTimeout = setTimeout(() => {
        if (!mapInitialized || !dataLoaded) return;
        
        mainMap.eachLayer(layer => {
            if (layer instanceof L.GeoJSON) {
                mainMap.removeLayer(layer);
            }
        });

        const currentYear = document.getElementById('current-year').value;
        const previousYear = document.getElementById('previous-year').value;

        L.geoJSON(countyBoundariesUSA, {
            style: function(feature) {
                const fipsCode = feature.properties.STATEFP + feature.properties.COUNTYFP;
                const change = getTurnoutChange(fipsCode, currentYear, previousYear); 
                const isSelected = fipsCode === selectedCountyFIPS;

                return {
                    fillColor: getChangeColor(change),
                    weight: isSelected ? 3 : 0.5,
                    opacity: 1,
                    color: isSelected ? '#ffff00' : 'white',
                    fillOpacity: 0.7
                };
            },
            onEachFeature: function(feature, layer) {
                const fipsCode = feature.properties.STATEFP + feature.properties.COUNTYFP;

                // ✅ CORRECT: get stateFP from the feature
                const stateFP = feature.properties.STATEFP;
                const stateName = stateNames[stateFP] || 'Unknown';

                const change = getTurnoutChange(fipsCode, currentYear, previousYear);
                const changeText = change !== null ? (change * 100).toFixed(2) + ' pp' : 'N/A';

                // Tooltip with county and state
                layer.bindTooltip(
                    `${feature.properties.NAME} County, ${stateName}<br>` +
                    `Turnout Change (${previousYear} to ${currentYear}): ${changeText}`
                );

                layer.on('click', function() {
                    highlightCounty(fipsCode);
                });
            }
        }).addTo(mainMap);
    }, 100); // Debounce by 100ms
}

// Initial call to fetch data and start the application
// Use defer to ensure DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchData);
} else {
    fetchData();
}