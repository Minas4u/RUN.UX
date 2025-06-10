// --- GLOBAL VARIABLES & CONSTANTS ---

// Hardcoded fallback for race date if not provided by the data source.
const DEFAULT_RACE_DATE_STRING = '2025-11-09';
// To store the current web app URL for data fetching.
let currentWebAppUrl = '';
// To hold the deferred PWA install prompt event.
let deferredInstallPrompt = null;

// Object mapping user IDs to their specific Google Apps Script web app URLs.
const userSpecificDataSources = {
    "ADMIN": "https://script.google.com/macros/s/AKfycbxfeBaM8_DTlCppjt6eLWztDV2YBJih2TfRju9iL8BWQMvf2FneqdYUqNRIb0ypWu9U/exec",
    "ALEX": "https://script.google.com/macros/s/AKfycbxqan2-K__zvFqJZ-b-se2SxNfPPCDHjuRyTxdatvv3AvIdnkJOdkQm8v3SPhcVgWoQvA/exec",
    "PENNY": "https://script.google.com/macros/s/AKfycbwLnp_ejK7kWEuH3opf9YHgtFBAnVsM3la7KyVf_gwmjwhlEJ2mi5hRK470Npl6nZ2vYg/exec",
    "VASSO": "https://script.google.com/macros/s/AKfycbyVKYRRgK0V2X1iYBvOkJ8Rny0j5_Ct3cqFpmTkcy8r7WDySOAwnOnzA5gVdlFtOOT4nw/exec",
    "MANOS": "https://script.google.com/macros/s/AKfycbzq-iMRa798Z_Fw7_Ply7gSSqOt8SggVTtRTgS6WPpHtIN8jjvOlFwTDeBBbAU1M_Ws/exec",
    "MAKIS": "https://script.google.com/macros/s/AKfycby8a0HjdYJ5zCXid_FrfX7WF_EWWpQ-RfFUo0yuB0IBiZs1U_T28TtG_u83PWL-UUyN/exec",
    "SAKIS": "https://script.google.com/macros/s/AKfycbz9XApaSi9N6ml4nz7C-ybobIyzpG81E7Kqakmsi_iDinG5msJK-_b0ijDgYJmuSvGAnA/exec",
    "EVI": "tba",
    "EVA": "tba",
    "ELENI": "https://script.google.com/macros/s/AKfycbwHzz_ww7-0Ucb0METuQoaQLVDyOy505HE7SmMyLggvvIcZMIhMGe-BMBXyh8oJC6mt/exec",
    "KONA": "tba",
    "NIKOL": "tba",
    "IOANNA": "tba",
};

// --- Companion App Data Source ---
const companionDataUrl = "https://script.google.com/macros/s/AKfycbw3fpGf2W8ANwIaioiZdXZBeEjw3vr1g3XSLf3KXPR3wKLDPYSDpRbFGjJ-BDZLYd6rKg/exec";

// Global variables to hold application state and data.
let marathonPlan = null; // Stores the entire JSON object from the Google Sheet.
let datedTrainingPlan = []; // Stores each day of the plan with a specific date.
let currentRaceDate = null; // The calculated date of the race.
let calendarCurrentDisplayDate = new Date(); // The month/year the calendar is currently showing.
let raceElevationChartInstance = null; // Chart.js instance for the elevation profile.
let mileageChartInstance = null; // Chart.js instance for the weekly mileage.
let companionData = null; // Stores data for the companion app.

// DOM element references for quick access.
const loginContainer = document.getElementById('login-container');
const mainAppWrapper = document.getElementById('main-app-wrapper');
const appContent = document.getElementById('app-content');
const loadingMessageDiv = document.getElementById('loading-message');
const errorMessageDiv = document.getElementById('error-message');
const loginErrorMessageDiv = document.getElementById('login-error-message');
const loginLoadingMessageDiv = document.getElementById('login-loading-message');
const installPwaButton = document.getElementById('installPwaButton');
const userIdInput = document.getElementById('userIdInput');
const loginButton = document.getElementById('loginButton');
const mainTitleProject = document.getElementById('mainTitleProject');
const mainTitleMarathon = document.getElementById('mainTitleMarathon');
const appHeaderTitleProject = document.getElementById('appHeaderTitleProject');
const appHeaderTitleMarathon = document.getElementById('appHeaderTitleMarathon');
const appSubtitle = document.getElementById('appSubtitle');
const navOverview = document.getElementById('nav-overview');
const navPlan = document.getElementById('nav-plan');
const navCalendar = document.getElementById('nav-calendar');
const navRace = document.getElementById('nav-race');
const navCompanion = document.getElementById('nav-companion');
const navInfo = document.getElementById('nav-info');
const mileageChartModal = document.getElementById('mileage-chart-modal');
const closeMileageChartBtn = document.getElementById('closeMileageChartBtn');
const updatesModal = document.getElementById('updates-modal');
const closeUpdatesModalBtn = document.getElementById('close-updates-modal-btn');
const updatesModalContent = document.getElementById('updates-modal-content');
const todaysTrainingContent = document.getElementById('todays-training-content');
const thisWeeksPlanContent = document.getElementById('this-weeks-plan-content');
const mileageChartModalCanvas = document.getElementById('mileageChartModalCanvas');
const phaseDetailsDiv = document.getElementById('phase-details');
const weekDetailsContainer = document.getElementById('week-details-container');
const calendarDayDetailsContent = document.getElementById('calendar-day-details-content');
const calendarSelectedDayHeader = document.getElementById('calendar-selected-day-header');
const calendarGridContainer = document.getElementById('calendar-grid-container');
const currentMonthYear = document.getElementById('currentMonthYear');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const raceElevationChartContainer = document.getElementById('raceElevationChartContainer');
const raceElevationChartCanvas = document.getElementById('raceElevationChart');
const companionAppContainer = document.getElementById('companion-app-container');
const companionLoadingMessage = document.getElementById('companion-loading-message');
const companionErrorMessage = document.getElementById('companion-error-message');
const companionNavigation = document.getElementById('companion-navigation');
const companionContent = document.getElementById('companion-content');


// --- UTILITY FUNCTIONS ---

/**
 * Parses a pace string (e.g., "5:30") into total seconds.
 * @param {string} paceString The pace string in "mm:ss" format.
 * @returns {number} Total seconds, or NaN if invalid.
 */
function parsePaceToSeconds(paceString) {
    if (!paceString || typeof paceString !== 'string') return NaN;
    const parts = paceString.trim().split(':'); if (parts.length !== 2) return NaN;
    const minutes = parseInt(parts[0], 10); const seconds = parseInt(parts[1], 10);
    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) return NaN;
    return (minutes * 60) + seconds;
}

/**
 * Formats total seconds into a pace string (e.g., "5:30").
 * @param {number} totalSeconds The total seconds to format.
 * @returns {string} The formatted pace string "m:ss".
 */
function formatSecondsToPace(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "N/A";
    const minutes = Math.floor(totalSeconds / 60); const seconds = Math.round(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Creates an HTML unordered list from an array of strings.
 * @param {string[]} items Array of strings to be converted to list items.
 * @returns {string} An HTML `<ul>` element as a string.
 */
function createHtmlList(items) {
    if (!items || !Array.isArray(items)) return '';
    return `<ul class="list-disc list-inside space-y-1 text-stone-700">${items.map(item => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = item; // Sanitize innerHTML to prevent XSS, though data is from a trusted source.
        return `<li>${tempDiv.innerHTML}</li>`;
    }).join('')}</ul>`;
}

// Date Utility Functions
function isValidDate(d) { return d instanceof Date && !isNaN(d); }
function formatDate(date, options = { year: 'numeric', month: 'long', day: 'numeric' }) {
    if (!isValidDate(date)) return "N/A";
    return date.toLocaleDateString(undefined, options);
}
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
function isSameDay(date1, date2) {
    if (!isValidDate(date1) || !isValidDate(date2)) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// --- PWA & INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // Set initial text values before any data is fetched.
    if(loginButton) loginButton.textContent = 'Enter the Run';
    if(mainTitleProject) mainTitleProject.textContent = 'project:';
    if(mainTitleMarathon) mainTitleMarathon.textContent = 'Marathon';
    if(appHeaderTitleProject) appHeaderTitleProject.textContent = 'project:';
    if(appHeaderTitleMarathon) appHeaderTitleMarathon.textContent = 'Marathon';
    if(appSubtitle) appSubtitle.textContent = 'Your interactive guide to marathon training.';
    if(navOverview) navOverview.textContent = 'Plan Overview';
    if(navPlan) navPlan.textContent = 'Training Plan';
    if(navCalendar) navCalendar.textContent = 'Calendar';
    if(navRace) navRace.textContent = 'Race';
    if(navCompanion) navCompanion.textContent = 'Companion';
    if(navInfo) navInfo.textContent = 'Info';

    if(loginButton) loginButton.addEventListener('click', handleLogin);
    if(userIdInput) userIdInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') { event.preventDefault(); handleLogin(); }});

    // PWA install prompt logic.
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        if (installPwaButton) {
            installPwaButton.classList.remove('hidden');
        }
    });

    if (installPwaButton) {
        installPwaButton.addEventListener('click', async () => {
            installPwaButton.classList.add('hidden');
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                const { outcome } = await deferredInstallPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredInstallPrompt = null;
            } else {
                console.log("PWA install prompt not available.");
            }
        });
    }

   window.addEventListener('appinstalled', () => {
        if (installPwaButton) {
            installPwaButton.classList.add('hidden');
        }
        deferredInstallPrompt = null;
        console.log('PWA was installed');
    });

    // Pre-fill the User ID input if it was stored previously.
    const lastUserId = localStorage.getItem('lastUserID');
    if (lastUserId && userIdInput) {
        userIdInput.value = lastUserId;
    }

    // Show the login screen by default.
    if(loginContainer) loginContainer.classList.remove('hidden');
    if(mainAppWrapper) mainAppWrapper.classList.add('hidden');

    // --- Dark Mode Toggle Functionality ---
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    const sunIconSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m8.66-15.66l-.707.707M4.049 20.95l-.707.707M21 12h-1M4 12H3m15.66 8.66l-.707-.707M3.049 4.049l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
        </svg>
    `;
    const moonIconSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
    `;

    function updateDarkModeButtonIcon(isDarkMode) {
        if (darkModeToggle) {
            darkModeToggle.innerHTML = isDarkMode ? sunIconSVG : moonIconSVG;
        }
    }

    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            updateDarkModeButtonIcon(true);
        } else {
            body.classList.remove('dark-mode');
            updateDarkModeButtonIcon(false);
        }
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isDarkMode = body.classList.toggle('dark-mode');
            const currentTheme = isDarkMode ? 'dark' : 'light';
            localStorage.setItem('theme', currentTheme);
            updateDarkModeButtonIcon(isDarkMode);
        });
    }

    // Load saved theme from localStorage or default to light
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Default to light mode and set the moon icon if no theme is saved.
        // CSS already defaults to light, this ensures button icon is correct.
        applyTheme('light');
    }
    // --- End of Dark Mode Toggle ---
});

/**
 * Initializes the main application after a successful login and data fetch.
 * Hides login UI, shows main app UI, sets up navigation, and renders the initial view.
 */
function initializeApp() {
    if(loadingMessageDiv) loadingMessageDiv.classList.add('hidden');
    if(errorMessageDiv) errorMessageDiv.classList.add('hidden');
    if(appContent) appContent.innerHTML = '';

    // Add event listeners to the main navigation buttons.
    if(navOverview) navOverview.addEventListener('click', renderOverview);
    if(navPlan) navPlan.addEventListener('click', renderTrainingPlan);
    if(navCalendar) navCalendar.addEventListener('click', renderCalendarTab);
    if(navRace) navRace.addEventListener('click', renderRaceTab);
    if(navCompanion) navCompanion.addEventListener('click', renderCompanionTab);
    if(navInfo) navInfo.addEventListener('click', renderInfoTab);

    // Add event listeners for the mileage chart modal
    if(mileageChartModal && closeMileageChartBtn) {
        closeMileageChartBtn.addEventListener('click', () => mileageChartModal.classList.add('hidden'));
        mileageChartModal.addEventListener('click', (e) => {
            if (e.target.id === 'mileage-chart-modal') {
                mileageChartModal.classList.add('hidden');
            }
        });
    }

    // Add event listeners for the new updates modal
    if(updatesModal && closeUpdatesModalBtn) {
        closeUpdatesModalBtn.addEventListener('click', () => updatesModal.classList.add('hidden'));
        updatesModal.addEventListener('click', (e) => {
             // Closes modal if user clicks on the background overlay
            if (e.target.id === 'updates-modal') {
                updatesModal.classList.add('hidden');
            }
        });
    }

    renderOverview(); // Render the default "Overview" tab.
    if(mainAppWrapper) mainAppWrapper.classList.remove('hidden');
    if(loginContainer) loginContainer.classList.add('hidden');

    // Show the updates modal after the main app is visible.
    showUpdatesModalIfNeeded();
}

// --- LOGIN & DATA FETCHING ---

/**
 * Handles the login process when the user clicks the login button.
 * Validates User ID, fetches data, and initializes the app on success.
 */
async function handleLogin() {
    if(!userIdInput || !loginErrorMessageDiv || !loginLoadingMessageDiv) return;
    const userId = userIdInput.value.trim().toUpperCase();
    loginErrorMessageDiv.classList.add('hidden');
    loginLoadingMessageDiv.classList.remove('hidden');
    currentWebAppUrl = userSpecificDataSources[userId];
    if (currentWebAppUrl) {
        localStorage.setItem('lastUserID', userId); // Remember user for next visit.
        localStorage.setItem('lastWebAppUrl', currentWebAppUrl);
        const success = await fetchMarathonPlan(currentWebAppUrl);
        if (success) initializeApp();
        else {
            loginLoadingMessageDiv.classList.add('hidden');
        }
    } else {
        loginErrorMessageDiv.textContent = "Invalid User ID. Try again or contact admin.";
        loginErrorMessageDiv.classList.remove('hidden');
        loginLoadingMessageDiv.classList.add('hidden');
    }
}

/**
 * Fetches the entire marathon training plan from the specified Google Apps Script URL.
 * Validates the structure of the returned JSON data.
 * @param {string} webAppUrlToUse The URL of the web app to fetch data from.
 * @returns {Promise<boolean>} True on successful fetch and parse, false otherwise.
 */
async function fetchMarathonPlan(webAppUrlToUse) {
    if (!webAppUrlToUse) {
        console.error("No Web App URL for fetching plan.");
        if(loginErrorMessageDiv) loginErrorMessageDiv.textContent = "Config error: Web App URL missing.";
        if(loginErrorMessageDiv) loginErrorMessageDiv.classList.remove('hidden');
        if(loginLoadingMessageDiv) loginLoadingMessageDiv.classList.add('hidden');
        return false;
    }
    try {
        const response = await fetch(webAppUrlToUse);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Network response not ok: ${response.status} ${response.statusText}. Details: ${errorText}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`Error from Google Sheet App: ${data.error}`);
        }

        // Basic validation of the received data structure.
        if (!data.uiText || typeof data.uiText !== 'object' ||
            !data.settings || !data.settings.zones || !Array.isArray(data.settings.zones) ||
            !data.settings.hasOwnProperty('defaultLt2Speed') ||
            !data.settings.hasOwnProperty('raceName') ||
            !data.settings.hasOwnProperty('planStartDate') ||
            !data.settings.hasOwnProperty('raceDistanceKm') ||
            !data.newsSection || !Array.isArray(data.newsSection) ||
            !data.paceGuide || !data.paceGuide.title || !Array.isArray(data.paceGuide.paces) ||
            !data.generalNotes || !data.generalNotes.title || !Array.isArray(data.generalNotes.notes) ||
            !Array.isArray(data.phases) ||
            !Array.isArray(data.mileageChartDataSource) ||
            !Array.isArray(data.raceElevationData) ||
            !data.raceTactics || typeof data.raceTactics !== 'object'
            ) {
            console.error("Fetched data structure validation failed. Data:", data);
            throw new Error("Fetched data incomplete or malformed. Check Apps Script doGet & Sheet structure. Ensure 'newsSection' is an array and 'planStartDate' is present.");
        }
        marathonPlan = data;
        updateStaticUIText();

        const planStartDateString = marathonPlan.settings.planStartDate;
        if (!planStartDateString || !isValidDate(new Date(planStartDateString + "T00:00:00"))) {
            throw new Error("Invalid or missing 'planStartDate' in settings from Google Sheet.");
        }
        const planStartDate = new Date(planStartDateString + "T00:00:00");

        let totalDaysInPlan = 0;
        marathonPlan.phases.forEach(phase => {
            phase.weeks.forEach(week => {
                totalDaysInPlan += week.days.length;
            });
        });

        if (totalDaysInPlan === 0) {
            throw new Error("Training plan has no scheduled days. Check 'Full Training Plan' sheet.");
        }

        const planEndDate = addDays(new Date(planStartDate), totalDaysInPlan - 1);
        currentRaceDate = planEndDate;

        calculateAndStoreDatedTrainingPlan(currentRaceDate);

        calendarCurrentDisplayDate = new Date(planStartDate);
        calendarCurrentDisplayDate.setDate(1);
        return true;
    } catch (error) {
        console.error('Failed to fetch marathon plan:', error);
        if(loginErrorMessageDiv) loginErrorMessageDiv.textContent = `Error loading plan: ${error.message}. Check User ID and Sheet/Script setup.`;
        if(loginErrorMessageDiv) loginErrorMessageDiv.classList.remove('hidden');
        if(loginLoadingMessageDiv) loginLoadingMessageDiv.classList.add('hidden');
        return false;
    }
}

/**
 * Populates the `datedTrainingPlan` array by assigning a specific date to each training day,
 * working backward from the race date.
 * @param {Date} planEndDate The final date of the plan (race day).
 */
function calculateAndStoreDatedTrainingPlan(planEndDate) {
    if (!marathonPlan || !marathonPlan.phases || !isValidDate(planEndDate)) {
        datedTrainingPlan = []; return;
    }
    let allDaysScheduled = [];
    marathonPlan.phases.forEach(phase => {
        phase.weeks.forEach(week => {
            week.days.forEach(dayString => allDaysScheduled.push({
                activity: dayString, notes: week.notes || "",
                phaseName: phase.name, weekNum: week.weekNum, totalKm: week.totalKm
            }));
        });
    });
    datedTrainingPlan = [];
    let tempCurrentDate = new Date(planEndDate);
    for (let i = allDaysScheduled.length - 1; i >= 0; i--) {
        datedTrainingPlan.unshift({ date: new Date(tempCurrentDate), ...allDaysScheduled[i] });
        tempCurrentDate = addDays(tempCurrentDate, -1);
    }
}

// --- UI RENDERING FUNCTIONS ---

/**
 * Updates static UI text elements (like titles and button labels) using data from the fetched plan.
 */
function updateStaticUIText() {
    const uiText = marathonPlan?.uiText;
    if (!uiText) {
        console.warn("marathonPlan.uiText not available. Using default HTML text.");
        if(loginButton) loginButton.textContent = 'Enter the Run';
        if(mainTitleProject) mainTitleProject.textContent = 'project:';
        if(mainTitleMarathon) mainTitleMarathon.textContent = 'Marathon';
        if(appHeaderTitleProject) appHeaderTitleProject.textContent = 'project:';
        if(appHeaderTitleMarathon) appHeaderTitleMarathon.textContent = 'Marathon';
        if(appSubtitle) appSubtitle.textContent = 'Your interactive guide to marathon training.';
        if(navOverview) navOverview.textContent = 'Plan Overview';
        if(navPlan) navPlan.textContent = 'Training Plan';
        if(navCalendar) navCalendar.textContent = 'Calendar';
        if(navRace) navRace.textContent = 'Race';
        if(navCompanion) navCompanion.textContent = 'Companion';
        if(navInfo) navInfo.textContent = 'Info';
        return;
    }

    if(loginButton) loginButton.textContent = uiText.loginButtonText || 'Enter the Run';
    if(mainTitleProject) mainTitleProject.textContent = uiText.mainTitleProject || 'project:';
    if(mainTitleMarathon) mainTitleMarathon.textContent = uiText.mainTitleMarathon || 'Marathon';
    if(appHeaderTitleProject) appHeaderTitleProject.textContent = uiText.mainTitleProject || 'project:';
    if(appHeaderTitleMarathon) appHeaderTitleMarathon.textContent = uiText.mainTitleMarathon || 'Marathon';
    if(appSubtitle) appSubtitle.textContent = uiText.appSubtitle || 'Your interactive guide to marathon training.';
    if(navOverview) navOverview.textContent = uiText.navButtonOverview || 'Plan Overview';
    if(navPlan) navPlan.textContent = uiText.navButtonPlan || 'Training Plan';
    if(navCalendar) navCalendar.textContent = uiText.navButtonCalendar || 'Calendar';
    if(navRace) navRace.textContent = uiText.navButtonRace || 'Race';
    if(navCompanion) navCompanion.textContent = uiText.navButtonCompanion || 'Companion';
    if(navInfo) navInfo.textContent = uiText.navButtonInfo || 'Info';
}

/**
 * Sets the visual "active" state for the currently selected navigation button.
 * @param {string} activeId The ID of the nav button to activate.
 */
function setActiveNav(activeId) {
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(btn => {
        btn.classList.remove('active-overview', 'active-plan', 'active-calendar', 'active-race', 'active-companion', 'active-info');
        if (btn.id === activeId) {
            if (activeId === 'nav-overview') btn.classList.add('active-overview');
            else if (activeId === 'nav-plan') btn.classList.add('active-plan');
            else if (activeId === 'nav-calendar') btn.classList.add('active-calendar');
            else if (activeId === 'nav-race') btn.classList.add('active-race');
            else if (activeId === 'nav-info') btn.classList.add('active-info');
            else if (activeId === 'nav-companion') btn.classList.add('active-companion');
            else btn.classList.add('active-overview'); // Default active style.
        }
    });
}

// --- OVERVIEW TAB ---

async function renderOverview() {
    if (!marathonPlan || !marathonPlan.uiText || !marathonPlan.uiText.overview || !appContent) return;
    setActiveNav('nav-overview');
    appContent.innerHTML = `
        <section id="overview-content" class="space-y-6">
            <div class="md:flex md:space-x-6 space-y-6 md:space-y-0 mb-6">
                <div id="todays-training-card" class="content-card p-4 md:flex-1 custom-rect-border-today">
                    <div id="todays-training-content"></div>
                </div>
                <div id="this-weeks-plan-card" class="content-card p-4 md:flex-1 custom-rect-border-this-week">
                    <div id="this-weeks-plan-content"></div>
                </div>
            </div>
        </section>`;

    renderTodaysTraining();
    renderThisWeeksPlan();
}

function renderTodaysTraining() {
    const container = document.getElementById('todays-training-content'); // Re-fetch as it's part of dynamic content
    if (!container || !marathonPlan || !marathonPlan.uiText || !marathonPlan.uiText.overview) {
        if(container) container.innerHTML = "<p>Loading today's training data...</p>";
        return;
    }

    if (datedTrainingPlan.length === 0 && marathonPlan.settings.planStartDate && marathonPlan) {
        const planStartDate = new Date(marathonPlan.settings.planStartDate + "T00:00:00");
        let totalDaysInPlan = 0;
        marathonPlan.phases.forEach(phase => phase.weeks.forEach(week => totalDaysInPlan += week.days.length));
        if (totalDaysInPlan > 0 && isValidDate(planStartDate)) {
            const planEndDate = addDays(new Date(planStartDate), totalDaysInPlan - 1);
            calculateAndStoreDatedTrainingPlan(planEndDate);
        }
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const todaysActivity = datedTrainingPlan.find(item => {
        const itemDate = new Date(item.date);
        itemDate.setHours(0,0,0,0);
        return isSameDay(itemDate, today);
    });

    let activityContentHtml = '';
    let titleHtml = `<h3 class="text-2xl font-semibold text-sky-700 mb-1 text-center">Today</h3>
                               <p class="text-xs text-stone-500 text-center mb-3">${formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}</p>`;
    let notesBoxHtml = '';
    const todayCard = document.getElementById('todays-training-card'); // Re-fetch

    if (todayCard) {
        todayCard.classList.add('custom-rect-border-today');
    }

    if (todaysActivity) {
        const activityTextForDisplay = todaysActivity.activity.replace(/^[^:]+:\s*/, '');
        const activityDescriptionOnly = todaysActivity.activity.replace(/^[^:]+:\s*/, '').trim();
        const firstWord = activityDescriptionOnly.split(" ")[0].toLowerCase().replace(/:$/, '');
        const colorClass = getActivityTextColorClass(firstWord);

        const lt2PaceString = marathonPlan?.settings?.defaultLt2Speed || "N/A";
        const paceString = getPaceStringForActivity(todaysActivity.activity, lt2PaceString);
        let paceHtml = paceString ? `<p class="pace-text text-lg font-semibold mt-1 ${colorClass}">Pace: ${paceString}</p>` : '';

        activityContentHtml = `
            <div class="todays-activity-box">
                <p><strong class="activity-text ${colorClass}">${activityTextForDisplay}</strong></p>
                ${paceHtml}
                <p class="text-xs text-stone-500 mt-2">Phase: ${todaysActivity.phaseName} | Week: ${todaysActivity.weekNum}</p>
            </div>
        `;
        if (todaysActivity.notes) {
            notesBoxHtml = `
                <div class="todays-weekly-notes-box">
                    <p class="text-sm italic"><strong class="text-black text-xs">Weekly Notes:</strong> <span class="text-stone-800 text-sm">${todaysActivity.notes}</span></p>
                </div>
            `;
        }
    } else {
        let message = "No training scheduled for today.";
        if (marathonPlan && marathonPlan.settings && marathonPlan.settings.planStartDate) {
            const planStartDate = new Date(marathonPlan.settings.planStartDate + "T00:00:00");
            if (isValidDate(planStartDate) && today < planStartDate) {
                message = `Plan starts on ${formatDate(planStartDate)}. No training scheduled yet.`;
            } else if (currentRaceDate && isValidDate(currentRaceDate) && today > currentRaceDate) {
                 message = `Plan ended on ${formatDate(currentRaceDate)}. No training scheduled.`;
            }
        }
        activityContentHtml = `<div class="todays-activity-box"><p class="text-stone-700">${message}</p></div>`;
    }

    const paceCalculatorHtml = `
        <div class="mt-4 space-y-2">
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold text-sky-700">Pace Zones</h3>
                <button id="toggleZonesButton" class="hidden">Show Zones</button>
            </div>
            <div id="today-zones-content"></div>
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold text-yellow-500">Repeats</h3>
                <button id="toggleRepeatsButton" class="hidden">Show Repeats</button>
            </div>
            <div id="today-repeats-content" class="mt-1"></div>
        </div>
    `;
    container.innerHTML = titleHtml + activityContentHtml + notesBoxHtml + paceCalculatorHtml;

    if (marathonPlan && marathonPlan.settings) {
        renderTodayPaces(marathonPlan.settings.defaultLt2Speed, todaysActivity);
    } else {
        const zonesContainer = document.getElementById('today-zones-content'); // Re-fetch
        const repeatsContainer = document.getElementById('today-repeats-content'); // Re-fetch
        const toggleZonesBtn = document.getElementById('toggleZonesButton'); // Re-fetch
        const toggleRepeatsBtn = document.getElementById('toggleRepeatsButton'); // Re-fetch
        if(zonesContainer) zonesContainer.innerHTML = `<p class="text-xs text-stone-500 italic">Loading pace data...</p>`;
        if(repeatsContainer) repeatsContainer.innerHTML = '';
        if(toggleZonesBtn) toggleZonesBtn.classList.add('hidden');
        if(toggleRepeatsBtn) toggleRepeatsBtn.classList.add('hidden');
    }
}

function renderThisWeeksPlan() {
    const container = document.getElementById('this-weeks-plan-content'); // Re-fetch
    if (!container || !marathonPlan || !marathonPlan.uiText || !marathonPlan.uiText.overview) {
        if(container) container.innerHTML = "<p>Loading this week's plan...</p>";
        return;
    }
    const thisWeeksPlanTitle = marathonPlan.uiText.overview.thisWeeksPlanTitle || "This Week";
    if (datedTrainingPlan.length === 0 && marathonPlan.settings.planStartDate && marathonPlan) {
        const planStartDate = new Date(marathonPlan.settings.planStartDate + "T00:00:00");
        let totalDaysInPlan = 0;
        marathonPlan.phases.forEach(phase => phase.weeks.forEach(week => totalDaysInPlan += week.days.length));
        if (totalDaysInPlan > 0 && isValidDate(planStartDate)) {
            const planEndDate = addDays(new Date(planStartDate), totalDaysInPlan - 1);
            calculateAndStoreDatedTrainingPlan(planEndDate);
        }
    }
    if (datedTrainingPlan.length === 0) {
         container.innerHTML = `<h3 class="text-2xl font-semibold text-green-700 mb-1 text-center">${thisWeeksPlanTitle}</h3><p class="text-stone-600 text-center">Training plan not loaded or is empty.</p>`;
        return;
    }

    const thisWeeksCard = document.getElementById('this-weeks-plan-card'); // Re-fetch
    if (thisWeeksCard) {
        thisWeeksCard.classList.add('custom-rect-border-this-week');
    }

    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeekOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(new Date().setDate(today.getDate() + startOfWeekOffset));
    monday.setHours(0, 0, 0, 0);
    const currentWeekActivities = [];
    let weekNotes = "";
    let weekInfoFound = false;

    for (let i = 0; i < 7; i++) {
        const dayInWeek = addDays(monday, i);
        dayInWeek.setHours(0,0,0,0);
        const activityForDay = datedTrainingPlan.find(item => {
            const itemDate = new Date(item.date);
            itemDate.setHours(0,0,0,0);
            return isSameDay(itemDate, dayInWeek);
        });

        let displayDayName = dayInWeek.toLocaleDateString(undefined, { weekday: 'short' });
        let activityDescription;

        if (activityForDay) {
            if (!weekInfoFound) {
                weekNotes = activityForDay.notes || "";
                weekInfoFound = true;
            }
            const activityString = activityForDay.activity;
            const dayPrefixMatch = activityString.match(/^(\w{3,4}(\s\d{1,2})?):\s*(.*)/s);
            if (dayPrefixMatch && dayPrefixMatch[1] && dayPrefixMatch[3]) {
                displayDayName = dayPrefixMatch[1].trim();
                activityDescription = dayPrefixMatch[3].trim();
            } else {
                activityDescription = activityString.trim();
            }
        } else {
            activityDescription = "Rest or Unscheduled";
        }

        const activityParts = activityDescription.split(/:(.*)/s);
        let formattedActivity = (activityParts.length > 1 && activityParts[0].trim() !== "")
            ? `<strong>${activityParts[0].trim()}</strong>: ${activityParts[1] ? activityParts[1].trim() : ''}`
            : activityDescription;

        currentWeekActivities.push({ dayName: displayDayName, activity: formattedActivity });
    }

    if (currentWeekActivities.length > 0) {
        const dayColors = ['bg-red-50', 'bg-orange-50', 'bg-amber-50', 'bg-yellow-50', 'bg-lime-50', 'bg-green-50', 'bg-emerald-50'];
        let tableRowsHtml = currentWeekActivities.map((dayEntry, index) => {
            const bgColor = dayColors[index % dayColors.length];
            return `<tr class="${bgColor}">
                        <td class="p-3 font-bold text-stone-800">${dayEntry.dayName}</td>
                        <td class="p-3 text-stone-700">${dayEntry.activity}</td>
                    </tr>`;
        }).join('');

        container.innerHTML = `
            <div class="flex items-center mb-2">
                <div class="flex-grow text-center">
                    <h3 class="text-2xl font-semibold text-green-700">${thisWeeksPlanTitle}</h3>
                </div>
                <button id="printWeekPdfBtn" class="pdf-button ml-auto no-print">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M5 2.5A2.5 2.5 0 0 1 7.5 0h5A2.5 2.5 0 0 1 15 2.5V5h-2.55a3 3 0 0 0-4.9 0H5V2.5zM10 6a2 2 0 0 0-1.936 1.5H5V15a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7.5h-3.064A2 2 0 0 0 10 6zm0 2a.75.75 0 0 1 .75.75v.032l1.533.306a.75.75 0 0 1-.293 1.455l-1.68-.335a.75.75 0 0 1-.59-.518L9.25 8.75A.75.75 0 0 1 10 8z" clip-rule="evenodd" /></svg>
                    PDF
                </button>
            </div>
            <div id="this-weeks-plan-printable-area" class="printable-area">
                <div class="overflow-x-auto rounded-lg border border-stone-200">
                    <table class="schedule-table min-w-full">
                        <thead>
                            <tr>
                                <th class="p-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600 bg-stone-100">Day</th>
                                <th class="p-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600 bg-stone-100">Activity</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-stone-200">
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                </div>
                ${weekNotes ? `<p class="text-sm italic mt-3 p-3 bg-stone-100 rounded-md"><strong class="text-black text-xs">Weekly Notes:</strong> <span class="text-stone-800 text-sm">${weekNotes}</span></p>` : ''}
            </div>
        `;
        const pdfBtn = document.getElementById('printWeekPdfBtn'); // Re-fetch
        if (pdfBtn) pdfBtn.addEventListener('click', () => printSelectedWeekToPdf('this-weeks-plan-printable-area'));
    } else {
        container.innerHTML = `<h3 class="text-2xl font-semibold text-green-700 mb-1 text-center">${thisWeeksPlanTitle}</h3><p class="text-stone-600 text-center">No training scheduled for this week or plan not loaded.</p>`;
    }
}

function printSelectedWeekToPdf(printableAreaId) {
    const originalContentToPrint = document.getElementById(printableAreaId);
    const printContainer = document.getElementById('print-section-container'); // Already a global constant

    if (originalContentToPrint && printContainer) {
        const clonedWeekContent = originalContentToPrint.cloneNode(true);
        clonedWeekContent.classList.add('currently-printing-this-week');
        // Ensure the cloned content itself is explicitly set to display block.
        // This helps if 'currently-printing-this-week' or its source had display:none from a non-print style.
        clonedWeekContent.style.setProperty('display', 'block', 'important');

        printContainer.innerHTML = '';
        printContainer.appendChild(clonedWeekContent);
        printContainer.classList.remove('hidden'); // Make print container visible

        window.print();

        printContainer.innerHTML = '';
        printContainer.classList.add('hidden');
    } else {
        console.error("Printable area or print container not found for ID:", printableAreaId);
        const tempErrorDiv = document.createElement('div');
        tempErrorDiv.textContent = 'Error preparing content for printing. Please try again.';
        tempErrorDiv.style.cssText = 'position:fixed; bottom:20px; left:20px; padding:10px; background-color:red; color:white; border-radius:5px;';
        document.body.appendChild(tempErrorDiv);
        setTimeout(() => { tempErrorDiv.remove(); }, 3000);
    }
}

async function showUpdatesModalIfNeeded() {
    const modal = updatesModal; // Use constant
    const container = updatesModalContent; // Use constant
    if (!modal || !container) return;

    try {
        await ensureCompanionData();
        if (!companionData || !companionData.updates || companionData.updates.length === 0) {
            return;
        }

        const list = companionData.updates.map(item => `
        <div class="updates-card mb-4">
            <h3 class="text-indigo-800 font-semibold text-xl mb-2">${item.title}</h3>
            <ul class="list-disc list-inside space-y-1 text-stone-700">
                ${item.content.map(line => `<li>${line}</li>`).join('')}
            </ul>
        </div>`).join('');

        container.innerHTML = `<h2 class="text-2xl font-bold text-center mb-4">Team Updates</h2><div class="space-y-4">${list}</div>`;
        modal.classList.remove('hidden');

    } catch(error) {
        console.error("Failed to show updates modal:", error);
    }
}

function renderMileageChart() {
    if (!marathonPlan || !marathonPlan.mileageChartDataSource) {
        console.warn("Mileage chart data source not available.");
        return;
    }
    const chartCanvas = mileageChartModalCanvas; // Use constant
    if (!chartCanvas) {
        console.warn("Mileage chart canvas not found in modal.");
        return;
    }
    const labels = marathonPlan.mileageChartDataSource.map(item => item.label);
    const dataPoints = marathonPlan.mileageChartDataSource.map(item => item.value);
    if (mileageChartInstance) mileageChartInstance.destroy();
    mileageChartInstance = new Chart(chartCanvas.getContext('2d'), {
        type: 'line',
        data: { labels: labels, datasets: [{
            label: 'Planned Weekly Kilometers', data: dataPoints, borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.1)', tension: 0.1, fill: true,
            pointBackgroundColor: '#0d9488', pointBorderColor: '#fff', pointHoverRadius: 7,
            pointHoverBackgroundColor: '#0d9488' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Kilometers (km)', font: { weight: '500' } } },
            x: { title: { display: true, text: 'Training Week', font: { weight: '500' } }, ticks: { autoSkip: true, maxTicksLimit: 20, callback: function(v,i,vals){ return this.getLabelForValue(v);}}}
        }, plugins: {
            tooltip: { enabled: true, mode: 'index', intersect: false, backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { weight: 'bold' }, callbacks: { label: function(ctx) { return `${ctx.dataset.label}: ${ctx.parsed.y} km`; } } },
            legend: { labels: { font: { weight: '500' } } }
        }}
    });
}

// --- TRAINING PLAN TAB ---

function renderTrainingPlan() {
    if (!marathonPlan || !marathonPlan.uiText || !marathonPlan.uiText.plan || !appContent) return;
    setActiveNav('nav-plan');
    appContent.innerHTML = '';
    const trainingPlanSection = document.createElement('section');
    trainingPlanSection.id = "training-plan-content";
    trainingPlanSection.className = "space-y-6";
    const phaseButtonsHtml = marathonPlan.phases.map((phase, index) =>
        `<button class="phase-button ${getPhaseButtonClass(phase.name)}" data-phase-index="${index}">${phase.name}</button>`
    ).join('');
    const selectPhaseTitle = marathonPlan.uiText.plan.selectPhaseTitle || "Select Training Phase:";
    trainingPlanSection.innerHTML = `
        <div>
            <h2 class="text-xl sm:text-2xl font-semibold text-sky-700 mb-4">${selectPhaseTitle}</h2>
            <div id="phase-navigation" class="flex flex-wrap gap-2 mb-6">${phaseButtonsHtml}</div>
            <div id="phase-details" class="space-y-4"><p class="text-stone-600 italic">Select a phase to see its details.</p></div>
        </div>
        <div id="week-details-container" class="mt-6"></div>
        `;
    appContent.appendChild(trainingPlanSection);
    document.querySelectorAll('#phase-navigation .phase-button').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('#phase-navigation .phase-button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            renderPhaseDetails(parseInt(e.target.dataset.phaseIndex));
        });
    });
    if (marathonPlan.phases && marathonPlan.phases.length > 0) {
        const firstPhaseButton = document.querySelector('#phase-navigation .phase-button');
        if (firstPhaseButton) { firstPhaseButton.classList.add('active'); renderPhaseDetails(0); }
    }
}

function renderPhaseDetails(phaseIndex) {
    const currentPhaseDetailsDiv = document.getElementById('phase-details'); // Re-fetch
    const currentWeekDetailsContainer = document.getElementById('week-details-container'); // Re-fetch
    if (!marathonPlan || !marathonPlan.uiText || !marathonPlan.uiText.plan || !currentPhaseDetailsDiv || !currentWeekDetailsContainer) return;

    const phase = marathonPlan.phases[phaseIndex];
    if (!phase) {
        currentPhaseDetailsDiv.innerHTML = '<p class="text-red-500">Error: Could not load phase details.</p>'; return;
    }
    currentWeekDetailsContainer.innerHTML = '';
    const phaseTitleColorClass = getPhaseTitleTextColorClass(phase.name);
    const phaseBorderColor = getPhaseTitleBorderColor(phase.name);

    const selectWeekTitle = marathonPlan.uiText.plan.selectWeekTitle || "Select a Week:";
    const weekButtonsHtml = (phase.weeks && Array.isArray(phase.weeks)) ? phase.weeks.map((week, index) => {
        const weekDateRange = getWeekDateRangeString(week, phase.name);
        const weekButtonTextColorClass = getPhaseTextColorClass(phase.name);
        return `<button class="week-button ${weekButtonTextColorClass}" data-phase-index="${phaseIndex}" data-week-index="${index}">${weekDateRange}</button>`
    }).join('') : '<p>No weeks available for this phase.</p>';

    currentPhaseDetailsDiv.innerHTML = `
        <div class="content-card">
            <h3 class="text-lg sm:text-xl font-semibold mb-1 phase-title-style ${phaseTitleColorClass}">${phase.name}</h3>
            <hr class="border-t-2 mb-2" style="border-color: ${phaseBorderColor};">
            <p class="text-sm text-stone-600 mb-1"><strong>Goal:</strong> ${phase.goal || 'N/A'}</p>
            <p class="text-sm text-stone-600 mb-3"><strong>Mileage Range:</strong> ${phase.mileageRange || 'N/A'}</p>
            <h4 class="text-md font-medium text-stone-700 mb-2">${selectWeekTitle}</h4>
            <div id="week-navigation-${phaseIndex}" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">${weekButtonsHtml}</div>
        </div>`;

    document.querySelectorAll(`#week-navigation-${phaseIndex} .week-button`).forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll(`#week-navigation-${phaseIndex} .week-button`).forEach(btn => {
                btn.classList.remove('active');
                const pIdxForClass = parseInt(btn.dataset.phaseIndex);
                const phaseNameForClass = marathonPlan.phases[pIdxForClass].name;
                btn.classList.remove('bg-sky-600', 'border-sky-600', 'text-white');
                btn.classList.add(getPhaseTextColorClass(phaseNameForClass));
            });
            e.currentTarget.classList.add('active');
            e.currentTarget.classList.remove(getPhaseTextColorClass(phase.name));
            renderWeekDetails(parseInt(e.currentTarget.dataset.phaseIndex), parseInt(e.currentTarget.dataset.weekIndex));
        });
    });

    if (phase.weeks && phase.weeks.length > 0) {
        const firstWeekButton = document.querySelector(`#week-navigation-${phaseIndex} .week-button`);
        if (firstWeekButton) {
            firstWeekButton.classList.add('active');
            firstWeekButton.classList.remove(getPhaseTextColorClass(phase.name));
            renderWeekDetails(phaseIndex, 0);
        }
    }
}

function getWeekDateRangeString(weekObject, phaseName) {
    if (!datedTrainingPlan || datedTrainingPlan.length === 0 ) {
        return `Week ${weekObject.weekNum}`;
    }
    const activitiesInThisWeek = datedTrainingPlan.filter(dayActivity =>
        dayActivity.phaseName === phaseName && dayActivity.weekNum == weekObject.weekNum
    );
    if (activitiesInThisWeek.length === 0) return `Week ${weekObject.weekNum}`;
    const weekDates = activitiesInThisWeek.map(activity => new Date(activity.date)).sort((a, b) => a - b);
    const startDate = weekDates[0]; const endDate = weekDates[weekDates.length - 1];
    const options = { month: 'short', day: 'numeric' };
    if (startDate && endDate) {
        if (isSameDay(startDate, endDate)) return startDate.toLocaleDateString(undefined, options);
        if (startDate.getMonth() === endDate.getMonth()) return `${startDate.toLocaleDateString(undefined, { month: 'short' })} ${startDate.getDate()} - ${endDate.getDate()}`;
        else return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}`;
    }
    return `Week ${weekObject.weekNum}`;
}

function getDisplayKm(totalKmString) {
    if (!totalKmString || typeof totalKmString !== 'string') return 'N/A';
    const rangeMatch = totalKmString.match(/(\d+)\s*-\s*(\d+)/); if (rangeMatch) return `${rangeMatch[2]}km`;
    const singleMatch = totalKmString.match(/(\d+)/); if (singleMatch) return `${singleMatch[1]}km`;
    return totalKmString;
}

function renderWeekDetails(phaseIndex, weekIndex) {
    const currentWeekDetailsContainer = document.getElementById('week-details-container'); // Re-fetch
    if (!marathonPlan || !currentWeekDetailsContainer) return;
    const week = marathonPlan.phases[phaseIndex]?.weeks[weekIndex];
    if (!week) {
        currentWeekDetailsContainer.innerHTML = '<p class="text-red-500">Error: Could not load week details.</p>'; return;
    }
    const dayColors = ['bg-red-50', 'bg-orange-50', 'bg-amber-50', 'bg-yellow-50', 'bg-lime-50', 'bg-green-50', 'bg-emerald-50'];

    let tableRowsHtml = (week.days && Array.isArray(week.days)) ? week.days.map((day, index) => {
        const parts = day.split(/:(.*)/s);
        const dayName = parts[0] ? parts[0].trim() : "";
        let activityText = parts[1] ? parts[1].trim() : day;

        const activityParts = activityText.split(/:(.*)/s);
        if (activityParts.length > 1 && activityParts[0].trim() !== "") {
             activityText = `<strong>${activityParts[0].trim()}</strong>: ${activityParts[1] ? activityParts[1].trim() : ''}`;
        } else {
            activityText = `<strong>${activityText}</strong>`;
        }
        return `<tr class="${dayColors[index % dayColors.length]}"><td class="p-3 font-medium text-stone-800">${dayName}</td><td class="p-3 text-stone-700">${activityText}</td></tr>`;
    }).join('') : '<tr><td colspan="2" class="p-3 text-stone-500">No daily schedule available.</td></tr>';

    const weekDetailsId = `week-details-printable-${phaseIndex}-${weekIndex}`;

    const paceGuideHtml = `<div class="content-card overview-section-card mt-6">
        <h2 class="text-xl sm:text-2xl font-semibold text-sky-700 mb-3">${marathonPlan.paceGuide.title || 'Pace Guide'}</h2>
        ${createHtmlList(marathonPlan.paceGuide.paces)}
    </div>`;

    const generalNotesHtml = `<div class="content-card overview-section-card mt-6">
        <h2 class="text-xl sm:text-2xl font-semibold text-sky-700 mb-3">${marathonPlan.generalNotes.title || 'Important Notes'}</h2>
        ${createHtmlList(marathonPlan.generalNotes.notes)}
    </div>`;

    currentWeekDetailsContainer.innerHTML = `
        <div class="content-card mt-4" id="${weekDetailsId}">
            <div class="flex justify-between items-center mb-2">
                <h4 class="text-lg font-semibold text-sky-700">Week ${week.weekNum} (Total: ${getDisplayKm(week.totalKm)})</h4>
                <div class="flex items-center gap-2">
                    <button id="showMileageChartBtnPlan" class="bg-teal-500 text-white text-xs font-bold py-1 px-3 rounded-full hover:bg-teal-600 transition-colors">Mileage Chart</button>
                    <button onclick="printSelectedWeekToPdf('${weekDetailsId}')" class="pdf-button no-print">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M5 2.5A2.5 2.5 0 0 1 7.5 0h5A2.5 2.5 0 0 1 15 2.5V5h-2.55a3 3 0 0 0-4.9 0H5V2.5zM10 6a2 2 0 0 0-1.936 1.5H5V15a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7.5h-3.064A2 2 0 0 0 10 6zm0 2a.75.75 0 0 1 .75.75v.032l1.533.306a.75.75 0 0 1-.293 1.455l-1.68-.335a.75.75 0 0 1-.59-.518L9.25 8.75A.75.75 0 0 1 10 8z" clip-rule="evenodd" /></svg>
                        PDF
                    </button>
                </div>
            </div>
            <div class="overflow-x-auto rounded-lg border border-stone-200">
                <table class="schedule-table min-w-full">
                    <thead><tr><th class="p-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600 bg-stone-100">Day</th><th class="p-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600 bg-stone-100">Activity</th></tr></thead>
                    <tbody class="divide-y divide-stone-200">${tableRowsHtml}</tbody>
                </table>
            </div>
            ${week.notes ? `<p class="text-sm italic mt-3 p-3 bg-stone-100 rounded-md"><strong class="text-black text-xs">Weekly Notes:</strong> <span class="text-stone-800 text-sm">${week.notes}</span></p>` : ''}
        </div>
        ${paceGuideHtml}
        ${generalNotesHtml}
        `;
    const showMileageChartBtnPlan = document.getElementById('showMileageChartBtnPlan'); // Re-fetch
    if(showMileageChartBtnPlan) showMileageChartBtnPlan.addEventListener('click', () => {
        if(mileageChartModal) {
            mileageChartModal.classList.remove('hidden');
            renderMileageChart();
        }
    });
}

// --- CALENDAR FUNCTIONS ---

function renderCalendarTab() {
    if (!marathonPlan || !marathonPlan.uiText || !marathonPlan.uiText.calendar || !appContent) return;
    setActiveNav('nav-calendar');
    appContent.innerHTML = '';
    const calendarSection = document.createElement('section');
    calendarSection.id = "calendar-content"; calendarSection.className = "space-y-6";
    const uiText = marathonPlan.uiText.calendar;
    calendarSection.innerHTML = `
        <div class="content-card overview-section-card">
            <h2 class="text-xl sm:text-2xl font-semibold text-amber-500 mb-2">${uiText.mainTitle || 'Training Calendar'}</h2>
            <div id="calendar-selected-day-header" class="mb-2 text-lg font-medium text-sky-700"></div>
            <div id="calendar-day-details-content" class="mb-4"></div>
            <div id="calendar-controls" class="flex justify-between items-center mb-4">
                <button id="prevMonthBtnCalendar" class="calendar-nav-button">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <h3 id="currentMonthYearCalendar" class="text-lg font-semibold text-stone-700"></h3>
                <button id="nextMonthBtnCalendar" class="calendar-nav-button">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            </div>
            <div id="calendar-grid-container" class="calendar-grid"></div>
        </div>`;
    appContent.appendChild(calendarSection);
    const prevBtn = document.getElementById('prevMonthBtnCalendar'); // Re-fetch
    const nextBtn = document.getElementById('nextMonthBtnCalendar'); // Re-fetch
    if(prevBtn) prevBtn.addEventListener('click', () => { calendarCurrentDisplayDate.setMonth(calendarCurrentDisplayDate.getMonth() - 1); renderCalendarGrid(); if(calendarDayDetailsContent) calendarDayDetailsContent.innerHTML = ''; if(calendarSelectedDayHeader) calendarSelectedDayHeader.innerHTML = ''; });
    if(nextBtn) nextBtn.addEventListener('click', () => { calendarCurrentDisplayDate.setMonth(calendarCurrentDisplayDate.getMonth() + 1); renderCalendarGrid(); if(calendarDayDetailsContent) calendarDayDetailsContent.innerHTML = ''; if(calendarSelectedDayHeader) calendarSelectedDayHeader.innerHTML = ''; });

    calendarCurrentDisplayDate = new Date();
    calendarCurrentDisplayDate.setDate(1);

    renderCalendarGrid();
    renderSelectedCalendarDayDetails(new Date());
}

function renderCalendarGrid() {
    const grid = document.getElementById('calendar-grid-container'); // Re-fetch
    const monthYearDisp = document.getElementById('currentMonthYearCalendar'); // Re-fetch
    if (!grid || !monthYearDisp) return;
    grid.innerHTML = '';
    const year = calendarCurrentDisplayDate.getFullYear(); const month = calendarCurrentDisplayDate.getMonth();
    monthYearDisp.textContent = calendarCurrentDisplayDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const firstDayOfMonth = new Date(year, month, 1); const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    let startingDayOfWeek = firstDayOfMonth.getDay(); if (startingDayOfWeek === 0) startingDayOfWeek = 6; else startingDayOfWeek--; // Monday as start of week.
    const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    dayHeaders.forEach(header => { const hc = document.createElement('div'); hc.className = 'calendar-header'; hc.textContent = header; grid.appendChild(hc); });
    for (let i = 0; i < startingDayOfWeek; i++) { const ec = document.createElement('div'); ec.className = 'calendar-day other-month'; grid.appendChild(ec); }
    const today = new Date(); today.setHours(0,0,0,0);
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div'); cell.className = 'calendar-day';
        const currentDateInLoop = new Date(year, month, day); currentDateInLoop.setHours(0,0,0,0);
        const activityForDay = datedTrainingPlan.find(item => {
            const itemDate = new Date(item.date);
            itemDate.setHours(0,0,0,0);
            return isSameDay(itemDate, currentDateInLoop);
        });
        if (isSameDay(currentDateInLoop, today)) cell.classList.add('is-today');
        let activityHtml = '';
        if (activityForDay) {
            cell.classList.add('has-activity');
            let activityText = activityForDay.activity.replace(/^[^:]+:\s*/, '');
            let thumbnailClass = getActivityThumbnailClass(activityText);
            cell.classList.add(thumbnailClass);
            cell.addEventListener('click', () => renderSelectedCalendarDayDetails(currentDateInLoop));
            activityHtml = `<span class="activity-thumbnail ${thumbnailClass}">${activityText.substring(0,12)}${activityText.length > 12 ? '...' : ''}</span>`;
        }
        cell.innerHTML = `<span class="day-number">${day}</span>` + activityHtml;
        grid.appendChild(cell);
    }
}

function renderSelectedCalendarDayDetails(date) {
    const detailsCont = document.getElementById('calendar-day-details-content'); // Re-fetch
    const headerCont = document.getElementById('calendar-selected-day-header'); // Re-fetch
    if (!detailsCont || !headerCont) return;

    const activityDetails = datedTrainingPlan.find(item => {
        const itemDate = new Date(item.date); itemDate.setHours(0,0,0,0);
        const selectedDate = new Date(date); selectedDate.setHours(0,0,0,0);
        return isSameDay(itemDate, selectedDate);
    });
    headerCont.innerHTML = `<h4 class="text-lg font-semibold text-sky-700">${formatDate(date, { month: 'long', day: 'numeric', year: 'numeric' })}</h4>`;
    if (activityDetails) {
        let activityText = activityDetails.activity.replace(/^[^:]+:\s*/, '');
        detailsCont.innerHTML = `
            <div class="content-card mt-0 printable-area" id="calendar-day-details-printable-area">
                <p class="mb-1">
                    <strong class="text-sky-600">Activity:</strong>
                    <span class="text-amber-500">${activityText}</span>
                </p>
                <p class="text-xs text-stone-500 mb-1">Phase: ${activityDetails.phaseName} | Week: ${activityDetails.weekNum}</p>
                ${activityDetails.notes ? `<p class="text-sm italic mt-1"><strong class="text-black text-xs">Weekly Notes:</strong> <span class="text-stone-800 text-sm">${activityDetails.notes}</span></p>` : ''}
            </div>`;
    } else {
        detailsCont.innerHTML = `
            <div class="content-card mt-0">
                <p class="text-stone-600">No training scheduled for this day.</p>
            </div>`;
    }
}

// --- RACE TAB FUNCTIONS ---

function renderRaceTab() {
    if (!marathonPlan || !marathonPlan.uiText || !marathonPlan.uiText.race || !marathonPlan.settings || !appContent) {
        if(appContent) appContent.innerHTML = "<p>Race information is currently unavailable. Please check sheet configuration.</p>";
        return;
    }
    setActiveNav('nav-race');
    appContent.innerHTML = '';
    const raceSection = document.createElement('section');
    raceSection.id = "race-content";
    raceSection.className = "space-y-6";

    const uiTextRace = marathonPlan.uiText.race;
    const raceName = marathonPlan.settings.raceName || "N/A";
    const raceDateFormatted = currentRaceDate ? formatDate(currentRaceDate) : "N/A (Set Plan Start Date)";
    const raceDistance = marathonPlan.settings.raceDistanceKm || "N/A";

    let tacticsHtml = `<h3 class="text-xl font-semibold text-violet-700 mb-3">${uiTextRace.tacticsTitle || "Race Strategy & Tactics"}</h3>`;
    if (marathonPlan.raceTactics) {
        if (marathonPlan.raceTactics.pacing && Array.isArray(marathonPlan.raceTactics.pacing) && marathonPlan.raceTactics.pacing.length > 0) {
            tacticsHtml += `<div class="mb-4"><h4 class="text-lg font-medium text-violet-600 mb-1">${uiTextRace.pacingSectionTitle || "Pacing Strategy"}</h4>${createHtmlList(marathonPlan.raceTactics.pacing)}</div>`;
        }
        if (marathonPlan.raceTactics.nutrition && Array.isArray(marathonPlan.raceTactics.nutrition) && marathonPlan.raceTactics.nutrition.length > 0) {
            tacticsHtml += `<div class="mb-4"><h4 class="text-lg font-medium text-violet-600 mb-1">${uiTextRace.nutritionSectionTitle || "Nutrition & Hydration Plan"}</h4>${createHtmlList(marathonPlan.raceTactics.nutrition)}</div>`;
        }
        if (marathonPlan.raceTactics.mentalPrep && Array.isArray(marathonPlan.raceTactics.mentalPrep) && marathonPlan.raceTactics.mentalPrep.length > 0) {
            tacticsHtml += `<div class="mb-4"><h4 class="text-lg font-medium text-violet-600 mb-1">${uiTextRace.mentalPrepSectionTitle || "Mental Preparation"}</h4>${createHtmlList(marathonPlan.raceTactics.mentalPrep)}</div>`;
        }
         if (marathonPlan.raceTactics.gear && Array.isArray(marathonPlan.raceTactics.gear) && marathonPlan.raceTactics.gear.length > 0) {
            tacticsHtml += `<div class="mb-4"><h4 class="text-lg font-medium text-violet-600 mb-1">${uiTextRace.gearChecklistTitle || "Gear Checklist"}</h4>${createHtmlList(marathonPlan.raceTactics.gear)}</div>`;
        }
    } else {
        tacticsHtml += "<p class='text-stone-500 italic'>Race tactics templates will appear here. Configure in 'Plan Overview' sheet.</p>";
    }

    raceSection.innerHTML = `
        <div class="content-card race-section-card">
            <h2 class="text-2xl sm:text-3xl font-bold text-violet-700 mb-3 text-center">${uiTextRace.mainTitle || "Race Day Hub"}</h2>
            <div class="mb-6 p-4 bg-violet-50 rounded-lg shadow race-section-card">
                <h3 class="text-xl font-semibold text-violet-600 mb-2 pb-1 border-b-2 border-violet-500">${uiTextRace.raceDetailsTitle || "Race Details"}</h3>
                <p class="text-lg"><strong class="text-violet-600 font-semibold">${uiTextRace.raceNameLabel || "Race:"}</strong> <span class="text-stone-700 font-bold">${raceName}</span></p>
                <p class="text-lg"><strong class="text-violet-600 font-semibold">${uiTextRace.raceDateLabel || "Date:"}</strong> <span class="text-stone-700 font-bold">${raceDateFormatted}</span> (Plan End Date)</p>
                <p class="text-lg"><strong class="text-violet-600 font-semibold">${uiTextRace.raceDistanceLabel || "Distance:"}</strong> <span class="text-stone-700 font-bold">${raceDistance} km</span></p>
            </div>
            <div class="mb-6" id="raceElevationChartContainer">
                <h3 class="text-xl font-semibold text-violet-600 mb-2">${uiTextRace.elevationProfileTitle || "Elevation Profile (per km)"}</h3>
                <div class="chart-container bg-white p-2 rounded-md shadow">
                    <canvas id="raceElevationChart"></canvas>
                </div>
                <p class="text-xs text-stone-500 mt-2 text-center">Elevation gain per kilometer of the race course.</p>
            </div>
            <div class="race-section-card p-4 rounded-lg bg-white shadow">
                ${tacticsHtml}
            </div>
        </div>
    `;
    appContent.appendChild(raceSection);
    renderRaceElevationChart();
}

function renderRaceElevationChart() {
    const container = document.getElementById('raceElevationChartContainer'); // Re-fetch
    const chartCanvas = document.getElementById('raceElevationChart'); // Re-fetch

    if (!marathonPlan || !marathonPlan.raceElevationData || marathonPlan.raceElevationData.length === 0) {
        if (container) {
            if (chartCanvas) chartCanvas.style.display = 'none';
            const p = container.querySelector('p.text-xs');
            if (p) p.textContent = "No elevation data available. Add to 'RaceElevationData' sheet.";
            else container.insertAdjacentHTML('beforeend', "<p class='text-stone-500 italic p-4 text-center'>No elevation data. Add to 'RaceElevationData' sheet.</p>");
        }
        console.warn("Race elevation data not available or empty.");
        return;
    }
    if (!chartCanvas) {
        console.warn("Race elevation chart canvas not found.");
        return;
    }
    chartCanvas.style.display = 'block';

    const labels = marathonPlan.raceElevationData.map(item => `Km ${item.kilometer}`);
    const dataPoints = marathonPlan.raceElevationData.map(item => item.elevationGain);

    if (raceElevationChartInstance) {
        raceElevationChartInstance.destroy();
    }
    raceElevationChartInstance = new Chart(chartCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Elevation Gain (m)',
                data: dataPoints,
                borderColor: 'rgba(124, 58, 237, 1)',
                backgroundColor: 'rgba(124, 58, 237, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: {
                y: { title: { display: true, text: 'Elevation Gain (meters)', font: { weight: '500' } } },
                x: { title: { display: true, text: 'Kilometer of Race', font: { weight: '500' } },
                    ticks: { autoSkip: true, maxTicksLimit: Math.ceil((marathonPlan.settings.raceDistanceKm || 21) / 5) }
                }
            }, plugins: {
                tooltip: { enabled: true, mode: 'index', intersect: false, callbacks: {
                        label: function(context) { return `Km ${context.label.replace('Km ','')}: ${context.parsed.y} m gain`; }
                    }
                },
                legend: { display: false }
            }
        }
    });
}

// --- COMPANION APP FUNCTIONS ---

async function ensureCompanionData() {
    if (companionData) return;
    const response = await fetch(companionDataUrl);
    if (!response.ok) throw new Error(`Companion data network response error (status: ${response.status})`);
    const data = await response.json();
    if (data.error) throw new Error(`Data error from Companion Google Sheet: ${data.error}`);
    companionData = data;
}

async function renderCompanionTab() {
    if(!appContent) return;
    setActiveNav('nav-companion');
    appContent.innerHTML = `
        <div id="companion-app-container">
             <div id="companion-loading-message">
                <svg class="animate-spin h-8 w-8 text-sky-600 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading team data...
            </div>
            <div id="companion-error-message" class="hidden"></div>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-stone-800 mt-2 text-center mb-6">
                <span class="text-sky-600">Team</span> <span class="text-emerald-600">Companion</span>
            </h2>
            <nav id="companion-navigation" class="mb-8 flex flex-wrap justify-center gap-2 sm:gap-4 pb-4 border-b-2 border-slate-200 hidden">
                <button id="comp-nav-drills" class="companion-nav-button drills">Drills</button>
                <button id="comp-nav-mobility" class="companion-nav-button mobility">Mobility</button>
                <button id="comp-nav-strength" class="companion-nav-button strength">Strength</button>
            </nav>
            <div id="companion-content"></div>
        </div>
    `;
    const compLoadingMsg = document.getElementById('companion-loading-message'); // Re-fetch
    const compErrorMsg = document.getElementById('companion-error-message'); // Re-fetch
    const compNav = document.getElementById('companion-navigation'); // Re-fetch

    try {
        await ensureCompanionData();
        if(compLoadingMsg) compLoadingMsg.classList.add('hidden');
        if(compNav) compNav.classList.remove('hidden');

        const compNavDrills = document.getElementById('comp-nav-drills'); // Re-fetch
        const compNavMobility = document.getElementById('comp-nav-mobility'); // Re-fetch
        const compNavStrength = document.getElementById('comp-nav-strength'); // Re-fetch

        if(compNavDrills) compNavDrills.addEventListener('click', renderCompanionDrills);
        if(compNavMobility) compNavMobility.addEventListener('click', renderCompanionMobility);
        if(compNavStrength) compNavStrength.addEventListener('click', renderCompanionStrength);

        renderCompanionDrills();
    } catch (error) {
        console.error('Failed to initialize companion app:', error);
        if (compLoadingMsg) compLoadingMsg.classList.add('hidden');
        if (compErrorMsg) {
            compErrorMsg.textContent = `Error: ${error.message}`;
            compErrorMsg.classList.remove('hidden');
        }
    }
}

function setActiveCompanionNav(activeId) {
    document.querySelectorAll('.companion-nav-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === activeId) {
            btn.classList.add('active');
        }
    });
}

function renderCompanionDrills() {
    setActiveCompanionNav('comp-nav-drills');
    const contentDiv = document.getElementById('companion-content'); // Re-fetch
    if(!contentDiv || !companionData || !companionData.drills) return;
    const grid = companionData.drills.map(item => createExerciseCard(item, 'drills')).join('');
    contentDiv.innerHTML = `<h2 class="text-2xl font-bold text-emerald-700 mb-4">Running Drills</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-4">${grid}</div>`;
}

function renderCompanionMobility() {
    setActiveCompanionNav('comp-nav-mobility');
    const contentDiv = document.getElementById('companion-content'); // Re-fetch
    if(!contentDiv || !companionData || !companionData.mobility) return;
    const grid = companionData.mobility.map(item => createExerciseCard(item, 'mobility')).join('');
    contentDiv.innerHTML = `<h2 class="text-2xl font-bold text-sky-700 mb-4">Mobility Exercises</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-4">${grid}</div>`;
}

function renderCompanionStrength() {
    setActiveCompanionNav('comp-nav-strength');
    const contentDiv = document.getElementById('companion-content'); // Re-fetch
    if(!contentDiv || !companionData || !companionData.strength) return;
    const grid = companionData.strength.map(item => createExerciseCard(item, 'strength')).join('');
    contentDiv.innerHTML = `<h2 class="text-2xl font-bold text-amber-700 mb-4">Strength Exercises</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-4">${grid}</div>`;
}

function createExerciseCard(item, type) {
    let details = '';
    if (type === 'drills') details = item.reps || '';
    if (type === 'mobility') details = item.duration || '';
    if (type === 'strength') details = `${item.sets || ''} sets of ${item.reps || item.duration}`;

    return `
        <div class="exercise-card">
            <div class="flex justify-between items-start flex-wrap gap-2">
                <h3 class="text-lg font-semibold">${item.name}</h3>
                <span class="details details-${type} flex-shrink-0">${details}</span>
            </div>
            <p class="text-stone-600 mt-2 mb-4">${item.description}</p>
            <a href="${item.videoUrl || '#'}" class="video-link" target="_blank" rel="noopener noreferrer">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>
                 Watch Video
            </a>
        </div>
    `;
}

// --- INFO TAB FUNCTIONS ---

function renderInfoTab() {
    if(!appContent) return;
    setActiveNav('nav-info');
    appContent.innerHTML = '';

    if (!marathonPlan || !marathonPlan.newsSection) {
        appContent.innerHTML = "<p>Info content is currently unavailable.</p>";
        return;
    }

    let infoHtml = '';
    const newsSection = marathonPlan.newsSection;

    if (newsSection && Array.isArray(newsSection) && newsSection.length > 0) {
        newsSection.forEach(newsItem => {
            if (newsItem && newsItem.title && Array.isArray(newsItem.content)) {
                infoHtml += `
                    <div class="content-card news-section-card mb-6">
                        <h3 class="text-xl sm:text-2xl font-semibold text-indigo-700 mb-3">${newsItem.title}</h3>
                        ${createHtmlList(newsItem.content)}
                    </div>`;
            }
        });
    } else {
        const noNewsMessage = (marathonPlan.uiText && marathonPlan.uiText.news && marathonPlan.uiText.news.noNewsAvailable)
                                ? marathonPlan.uiText.news.noNewsAvailable
                                : "No information to display at the moment.";
        infoHtml = `<div class="content-card news-section-card"><p>${noNewsMessage}</p></div>`;
    }

    appContent.innerHTML = `<h2 class="text-2xl font-bold text-indigo-700 mb-4">Info</h2><div class="space-y-4">${infoHtml}</div>`;
}

// --- PACE CALCULATOR FUNCTIONS ---
// (These are called from within renderTodaysTraining, which is part of OVERVIEW TAB)

function getActivityTextColorClass(activityFirstWord) {
    switch (activityFirstWord) {
        case 'easy': return 'activity-text-easy';
        case 'recovery': return 'activity-text-recovery';
        case 'base': return 'activity-text-base';
        case 'tempo': return 'activity-text-tempo';
        case 'interval': case 'intervals': return 'activity-text-interval';
        case 'fartlek': return 'activity-text-fartlek';
        case 'str': case 'hills': return 'activity-text-str';
        case 'rest': return 'activity-text-rest';
        case 'zone': case 'race': return 'activity-text-zone';
        case 'double': return 'activity-text-double';
        case 'mobility': return 'activity-text-mobility';
        default: return '';
    }
}

function getPaceStringForActivity(activityString, lt2PaceString) {
    if (!activityString || !lt2PaceString || lt2PaceString === "N/A") return '';
    const lt2SpeedInSeconds = parsePaceToSeconds(lt2PaceString);
    if (isNaN(lt2SpeedInSeconds)) return '';

    const zonesData = [
        { name: "Z1", lowPaceFactor: 1.54, highPaceFactor: 1.33 },
        { name: "Z2", lowPaceFactor: 1.32, highPaceFactor: 1.16 },
        { name: "Z3", lowPaceFactor: 1.15, highPaceFactor: 1.01 },
        { name: "Z4", lowPaceFactor: 1.00, highPaceFactor: 0.91 },
        { name: "Z5", lowPaceFactor: 0.90, highPaceFactor: 0.83 }
    ];

    const zoneRegex = /(Z[1-5])\s*\((Low|Average|High)\)/gi;
    let match;
    const paces = [];

    while ((match = zoneRegex.exec(activityString)) !== null) {
        const zoneName = match[1].toUpperCase();
        const paceType = match[2].toLowerCase();
        const zoneInfo = zonesData.find(z => z.name === zoneName);

        if (zoneInfo) {
            let paceInSeconds;
            if (paceType === 'low') paceInSeconds = lt2SpeedInSeconds * zoneInfo.lowPaceFactor;
            else if (paceType === 'high') paceInSeconds = lt2SpeedInSeconds * zoneInfo.highPaceFactor;
            else if (paceType === 'average') paceInSeconds = lt2SpeedInSeconds * (zoneInfo.lowPaceFactor + zoneInfo.highPaceFactor) / 2;
            if (paceInSeconds) paces.push(formatSecondsToPace(paceInSeconds));
        }
    }
    return paces.join(' - ');
}

function renderTodayPaces(lt2PaceString, todaysActivityForHighlight) {
    const zonesContainer = document.getElementById('today-zones-content'); // Re-fetch
    const repeatsContainer = document.getElementById('today-repeats-content'); // Re-fetch
    const toggleZonesButton = document.getElementById('toggleZonesButton'); // Re-fetch
    const toggleRepeatsButton = document.getElementById('toggleRepeatsButton'); // Re-fetch

    if (!zonesContainer || !repeatsContainer || !toggleZonesButton || !toggleRepeatsButton) {
        console.error("Pace display UI elements not found.");
        return;
    }

    if (!lt2PaceString || lt2PaceString === "N/A") {
        zonesContainer.innerHTML = `<p class="text-xs text-stone-500 italic">Set Default LT2 Speed in Settings sheet to see paces.</p>`;
        repeatsContainer.innerHTML = '';
        toggleZonesButton.classList.add('hidden');
        toggleRepeatsButton.classList.add('hidden');
        return;
    }
    const lt2SpeedInSeconds = parsePaceToSeconds(lt2PaceString);
    if (isNaN(lt2SpeedInSeconds) || lt2SpeedInSeconds <= 0) {
        zonesContainer.innerHTML = `<p class="text-xs text-red-500 italic">Invalid LT2 speed format in Settings ('${lt2PaceString}'). Use mm:ss.</p>`;
        repeatsContainer.innerHTML = '';
        toggleZonesButton.classList.add('hidden');
        toggleRepeatsButton.classList.add('hidden');
        return;
    }

    toggleZonesButton.classList.remove('hidden');
    toggleRepeatsButton.classList.remove('hidden');

    const zonesData = [
        { name: "Z1", descriptor: "Easy/Rec", lowPaceFactor: 1.54, highPaceFactor: 1.33, colorClass: "text-green-600" },
        { name: "Z2", descriptor: "Aerobic", lowPaceFactor: 1.32, highPaceFactor: 1.16, colorClass: "text-sky-600" },
        { name: "Z3", descriptor: "Tempo/MP", lowPaceFactor: 1.15, highPaceFactor: 1.01, colorClass: "text-lime-600" },
        { name: "Z4", descriptor: "Threshold", lowPaceFactor: 1.00, highPaceFactor: 0.91, colorClass: "text-amber-500" },
        { name: "Z5", descriptor: "VO2 Max", lowPaceFactor: 0.90, highPaceFactor: 0.83, colorClass: "text-red-600" }
    ];
    let zonesTableHtml = `<table id="today-zones-table" class="today-pace-table hidden"><thead><tr>
                                <th class="header-zone">Zone</th><th class="header-pace">Pace</th>
                                <th class="header-low">Low</th><th class="header-average">Average</th>
                                <th class="header-high">High</th></tr></thead><tbody>`;
    zonesData.forEach(zone => {
        const sPS = lt2SpeedInSeconds * zone.lowPaceFactor;
        const fPS = lt2SpeedInSeconds * zone.highPaceFactor;
        const avgPS = (sPS + fPS) / 2;
        zonesTableHtml += `<tr><td class="${zone.colorClass} font-semibold">${zone.name}</td>
                                 <td class="font-bold">${formatSecondsToPace(sPS)} - ${formatSecondsToPace(fPS)}</td>
                                 <td class="font-bold">${formatSecondsToPace(sPS)}</td>
                                 <td class="font-bold">${formatSecondsToPace(avgPS)}</td>
                                 <td class="font-bold">${formatSecondsToPace(fPS)}</td></tr>`;
    });
    zonesTableHtml += `</tbody></table>`;
    zonesContainer.innerHTML = zonesTableHtml;

    const zonesTable = document.getElementById('today-zones-table'); // Re-fetch
    if(zonesTable) {
        toggleZonesButton.textContent = zonesTable.classList.contains('hidden') ? 'Show Zones' : 'Hide Zones';
        toggleZonesButton.onclick = function() {
            zonesTable.classList.toggle('hidden');
            this.textContent = zonesTable.classList.contains('hidden') ? 'Show Zones' : 'Hide Zones';
        }
        zonesTable.querySelectorAll('td').forEach(td => td.classList.remove('highlight-zone-pace'));
        if (todaysActivityForHighlight && todaysActivityForHighlight.activity) {
            const activityText = todaysActivityForHighlight.activity.replace(/^[^:]+:\s*/, '');
            const zoneRegex = /(Z[1-5])\s*\((Low|Average|High)\)/gi;
            let match;
            while ((match = zoneRegex.exec(activityText)) !== null) {
                const zoneToHighlight = match[1].toUpperCase();
                const paceTypeToHighlight = match[2].toLowerCase();
                const rows = zonesTable.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const zoneCell = row.cells[0];
                    if (zoneCell && zoneCell.textContent.trim().toUpperCase() === zoneToHighlight) {
                        let cellToHighlight;
                        if (paceTypeToHighlight === 'low') cellToHighlight = row.cells[2];
                        else if (paceTypeToHighlight === 'average') cellToHighlight = row.cells[3];
                        else if (paceTypeToHighlight === 'high') cellToHighlight = row.cells[4];
                        if (cellToHighlight) cellToHighlight.classList.add('highlight-zone-pace');
                    }
                });
            }
        }
    }

    const repeatDistances = [
        {d:"3km",f:1.02,m:3},{d:"1 Mile",f:0.98,m:1.60934},{d:"1km",f:0.95,m:1},
        {d:"800m",f:0.92,m:0.8},{d:"400m",f:0.88,m:0.4},{d:"200m",f:0.85,m:0.2}
    ];
    let repeatsTableHtml = `<table id="today-repeats-table" class="today-pace-table mt-1 hidden"><thead><tr><th>Dist.</th><th>Time</th><th>Pace/km</th></tr></thead><tbody>`;
    repeatDistances.forEach(item => {
        const tPPS = lt2SpeedInSeconds * item.f;
        const tTDS = tPPS * item.m;
        repeatsTableHtml += `<tr><td class="text-teal-700 font-semibold">${item.d}</td><td class="font-bold">${formatSecondsToPace(tTDS)}</td><td class="font-bold">${formatSecondsToPace(tPPS)}</td></tr>`;
    });
    repeatsTableHtml += `</tbody></table>`;
    repeatsContainer.innerHTML = repeatsTableHtml;

    const repeatsTable = document.getElementById('today-repeats-table'); // Re-fetch
    if(repeatsTable) {
        toggleRepeatsButton.textContent = repeatsTable.classList.contains('hidden') ? 'Show Repeats' : 'Hide Repeats';
        toggleRepeatsButton.onclick = function() {
            repeatsTable.classList.toggle('hidden');
            this.textContent = repeatsTable.classList.contains('hidden') ? 'Show Repeats' : 'Hide Repeats';
        };
    }
}

// Helper functions for dynamic phase/week button styling (used in Training Plan Tab)
function getPhaseButtonClass(phaseName) {
    const nameLower = phaseName.toLowerCase();
    if (nameLower.includes("preseason")) return "phase-button-preseason";
    if (nameLower.includes("base")) return "phase-button-base";
    if (nameLower.includes("specific")) return "phase-button-specific";
    if (nameLower.includes("taper")) return "phase-button-taper";
    return "phase-button-base";
}
function getPhaseTitleBorderColor(phaseName) {
    const nameLower = phaseName.toLowerCase();
    if (nameLower.includes("preseason")) return "#6b7280";
    if (nameLower.includes("base")) return "#0ea5e9";
    if (nameLower.includes("specific")) return "#059669";
    if (nameLower.includes("taper")) return "#dc2626";
    return "#0ea5e9";
}
function getPhaseTitleTextColorClass(phaseName) {
    const nameLower = phaseName.toLowerCase();
    if (nameLower.includes("preseason")) return "text-gray-600";
    if (nameLower.includes("base")) return "text-sky-700";
    if (nameLower.includes("specific")) return "text-green-700";
    if (nameLower.includes("taper")) return "text-red-700";
    return "text-sky-700";
}
function getPhaseTextColorClass(phaseName) {
    const nameLower = phaseName.toLowerCase();
    if (nameLower.includes("preseason")) return "week-button-text-preseason";
    if (nameLower.includes("base")) return "week-button-text-base";
    if (nameLower.includes("specific")) return "week-button-text-specific";
    if (nameLower.includes("taper")) return "week-button-text-taper";
    return "week-button-text-base";
}
// Helper function for calendar day thumbnail (used in Calendar Tab)
function getActivityThumbnailClass(activityText) {
    const lowerActivity = activityText.toLowerCase();
    if (lowerActivity.startsWith("fartlek")) return "activity-thumbnail-fartlek";
    if (lowerActivity.startsWith("easy")) return "activity-thumbnail-easy-green";
    if (lowerActivity.startsWith("interval")) return "activity-thumbnail-interval";
    if (lowerActivity.includes("race day")) return "activity-thumbnail-race";
    if (lowerActivity.startsWith("rest") || lowerActivity.includes("active recovery")) return "activity-thumbnail-rest";
    if (lowerActivity.startsWith("tempo")) return "activity-thumbnail-tempo";
    if (lowerActivity.startsWith("long run")) return "activity-thumbnail-long";
    return "activity-thumbnail-default";
}
