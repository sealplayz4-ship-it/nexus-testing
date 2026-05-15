console.log("Script loaded");

document.addEventListener("DOMContentLoaded", () => {
const startButton = document.getElementById("startButton");

    document.getElementById("homeScreen").classList.remove("hidden");

    document.getElementById("testScreen").classList.add("hidden");
    document.getElementById("sectionScreen").classList.add("hidden");
    document.getElementById("resultScreen").classList.add("hidden");
    document.getElementById("authScreen").classList.add("hidden");

    updateNavbar();

    supabaseClient.auth.onAuthStateChange((_event, _session) => {
        updateNavbar();
    });
});

// Global Variables

let questions = []
let questionBank = [];

const sections = [
    {
        name: "Analytical Reasoning",
        description: "This section evaluates your ability to reason through computational and systems-oriented problems. Questions focus on optimization, constraints, dependencies, tradeoffs, and identifying the most effective solutions under different conditions."
    },
    {
        name: "Data Structures and Algorithms",
        description: "This section evaluates your understanding of common data structures, algorithms, and their tradeoffs. Questions focus on selecting efficient approaches under different constraints, reasoning about performance, and understanding how various structures behave in practical scenarios."
    },
    {
        name: "Systems",
        description: "This section evaluates your understanding of how computer systems manage resources, communication, and performance. Questions focus on concepts such as memory, processes, concurrency, scaling, bottlenecks, and system stability."
    },
    {
        name: "Code Comprehension",
        description: `This section evaluates your ability to mentally simulate and understand program behavior using pseudocode. Questions focus on execution flow, loops, conditionals, state changes, debugging logic, and predicting program output.

        Pseudocode Conventions
        Ranges use interval notation. For example from (1 to 3] does not include 1 but does include 3.
        Variables update sequentially
        Assume standard execution flow unless stated otherwise
        Variables are passed by reference unless otherwise stated.
        Assume loops terminate if condition becomes false after update`
    }
];

const sectionScores = {
  ar: 0,
  ds: 0,
  s: 0,
  cc: 0,
};

const TRANSITION_TIME = 250;

let currentQuestion = 0;
let currentSectionIndex = 0;
let score = 0;
let scoreStrength = null;

let selectedAnswer = null;
let previousSection = "ar";

let supabaseUrl = "https://qhihhbdhlpowflzfdoqo.supabase.co";
let supabaseKey = "sb_publishable_dlNHRTBRY2F3WvMiLc9iug_iokeJBLR";

let currentPublicProfileId = null;
let currentThreadUserId = null;
let currentForumPostId = null;

let userAnswers = [];

const DEFAULT_FORUM_NAV_TEXT = "Forum";
const DEFAULT_INBOX_NAV_TEXT = "Inbox";

const inboxButton = document.getElementById("inboxNavButton");

const supabaseClient = supabase.createClient(
    supabaseUrl,
    supabaseKey);

console.log("Supabase client created");

const questionEl = document.getElementById("questionText");
const answerButtons = document.getElementById("answerButtons");

let scoreSavedThisSession = false;

async function loadQuestionsFromSupabase() {
    const { data, error } = await supabaseClient
        .from("public_questions")
        .select("*");

    if (error) {
        console.error("Question load failed:", error);
        return;
    }

    questionBank = data;

    console.log("Loaded data:", data);
    console.log("questionBank after assignment:", questionBank);
    console.log("Sections in questionBank:", [...new Set(questionBank.map(q => q.section))]);
}

function shuffleArray(array) {
    return [...array].sort(() => Math.random() - 0.5);
}

function buildRandomTest() {
    console.log("questionBank at build time:", questionBank);
    console.log("questionBank length:", questionBank.length);
    console.log("Sections at build time:", [...new Set(questionBank.map(q => q.section))]);

    const sectionOrder = ["ar", "ds", "s", "cc"];
    const questionsPerSection = 7;

    questions = [];

    sectionOrder.forEach(section => {
        const sectionQuestions = questionBank.filter(q =>
            q.section && q.section.trim().toLowerCase() === section
        );

        console.log("Section:", section, "Count:", sectionQuestions.length);

        const randomSectionQuestions = shuffleArray(sectionQuestions).slice(0, questionsPerSection);
        questions.push(...randomSectionQuestions);
    });

    console.log("Final randomized questions:", questions);
}

function switchScreen(fromScreen, toScreen, callback) {

    fromScreen.classList.add("fade-out");

    setTimeout(() => {

        fromScreen.classList.add("hidden");
        fromScreen.classList.remove("fade-out");

        toScreen.classList.remove("hidden");

        // start hidden
        toScreen.classList.add("fade-out");

        // force reflow
        void toScreen.offsetWidth;

        // fade in
        toScreen.classList.remove("fade-out");

        activeScreen = toScreen;

        if (callback) callback();

    }, TRANSITION_TIME);
}

function loadQuestion(animated = true) {

        console.log("Loading question index:", currentQuestion);
    console.log("Question count:", questions.length);
    console.log("Question object:", questions[currentQuestion]);

    if (!questions[currentQuestion]) {
        console.error("No question found at index", currentQuestion);
        return;
    }

    if (!questions[currentQuestion]) return;

    const card = document.querySelector(".test-card");
    const question = questions[currentQuestion];

    updateProgressBar();

    function populateQuestion() {

        questionEl.textContent = question.question;

        const codeBlock = document.getElementById("codeBlock");

if (question.code) {
    codeBlock.textContent = question.code;
    codeBlock.classList.remove("hidden");
} else {
    codeBlock.textContent = "";
    codeBlock.classList.add("hidden");
}

        answerButtons.innerHTML = "";

        question.answers.forEach((answer, index) => {

            const button = document.createElement("button");

            button.textContent = answer;
            button.classList.add("answer-btn");

            button.addEventListener("click", () => {

                Array.from(answerButtons.children).forEach(btn => {
                    btn.style.backgroundColor = "";
                });

                button.style.backgroundColor = "lightblue";

                selectedAnswer = index;
            });

            answerButtons.appendChild(button);
        });
    }

    // FIRST LOAD: no animation
    if (!animated) {

        card.classList.remove("card-hidden");

        populateQuestion();

        return;
    }

    // NORMAL QUESTION TRANSITIONS
    card.classList.add("card-hidden");

    setTimeout(() => {

        populateQuestion();

        card.classList.remove("card-hidden");

    }, TRANSITION_TIME);
}
function showScreen(screenToShow) {

    const screens = document.querySelectorAll(".screen");

    screens.forEach(screen => {
        screen.classList.add("hidden");
    });

    screenToShow.classList.remove("hidden");
}

startButton.addEventListener("click", async function () {
    if (questionBank.length === 0) {
        await loadQuestionsFromSupabase();
    }

    buildRandomTest();

    currentQuestion = 0;
    currentSectionIndex = 0;
    previousSection = "ar";
    score = 0;
    selectedAnswer = null;
    userAnswers = [];

    sectionScores.ar = 0;
    sectionScores.ds = 0;
    sectionScores.s = 0;
    sectionScores.cc = 0;

    switchScreen(screens.home, screens.section, () => {
        showSection(0);
    });

    // Start button
await trackEvent("started_test");
});

function showSection(index) {

    const section = sections[index];

    document.getElementById("sectionTitle").textContent = section.name;
    document.getElementById("sectionDescription").textContent = section.description;
}

function getCurrentSection() {
    return questions[currentQuestion].section;
}

function findBestCategory() {
let strongestCategory = null;
let highestScore = -Infinity;

for (const [section, score] of Object.entries(sectionScores)) {
  if (score > highestScore) {
    highestScore = score;
    strongestCategory = section;
  }
}
return strongestCategory;
}

function updateProgressBar() {

    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");

    const progressPercent = ((currentQuestion + 1) / questions.length) * 100;

    progressBar.style.width = progressPercent + "%";

    progressText.textContent =
        `Question ${currentQuestion + 1} / ${questions.length}`;
}

function showResults() {
    const scoreText = document.getElementById("scoreText");
    const performanceText = document.getElementById("performanceText");
    const categoryResults = document.getElementById("categoryResults");
    const recommendationText = document.getElementById("recommendationText");

    scoreText.textContent = `${score}/${questions.length}`;

    if (score > 25) {
        performanceText.textContent = "Very strong overall performance.";
    } else if (score > 20) {
        performanceText.textContent = "Strong overall performance.";
    } else if (score > 15) {
        performanceText.textContent = "Average overall performance.";
    } else {
        performanceText.textContent = "Beginner level overall performance.";
    }

    const categoryNames = {
        ar: "Analytical Reasoning",
        ds: "Data Structures & Algorithms",
        s: "Systems",
        cc: "Code Comprehension"
    };

    categoryResults.innerHTML = "";

    for (const [key, value] of Object.entries(sectionScores)) {
        const percent = (value / 7) * 100;

        const row = document.createElement("div");
        row.classList.add("category-row");

        row.innerHTML = `
            <div class="category-label">
                <span>${categoryNames[key]}</span>
                <span>${value} / 7</span>
            </div>

            <div class="category-bar-bg">
                <div class="category-bar-fill" style="width: ${percent}%"></div>
            </div>
        `;

        categoryResults.appendChild(row);
    }

    const weakestCategory = Object.entries(sectionScores)
        .sort((a, b) => a[1] - b[1])[0][0];

    recommendationText.textContent =
        `Recommended focus: ${categoryNames[weakestCategory]}.`;

    handleResultAuthState(false);
}

async function signUp() {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    const message = document.getElementById("authMessage");

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        message.textContent = error.message;
        return;
    }

    const newUser = data.user;

    if (newUser) {
        const { error: profileError } = await supabaseClient
            .from("profiles")
            .upsert({
                id: newUser.id,
                username: null,
                display_name: null,
                school: null,
                major: null,
                interests: null,
                bio: null,
                updated_at: new Date().toISOString()
            });

        if (profileError) {
            console.error("Profile creation failed:", profileError);
            message.textContent = "Account created, but profile setup failed.";
            return;
        }
    }

    message.textContent = "Account created.";

    await updateNavbar();
    await trySavePendingScore();

const hasCompletedTest =
    questions.length > 0 &&
    userAnswers.length === questions.length &&
    currentQuestion >= questions.length;

if (hasCompletedTest) {
    await trySavePendingScore();
showNextStep({
    title: "Your score has been saved.",
    text: "Complete your profile so other students can find you on the leaderboard, forum, and messaging system.",
    primaryText: "Complete Profile",
    primaryAction: openProfile,
    secondaryText: "View Results",
    secondaryAction: () => switchScreen(activeScreen, screens.result)
});    await handleResultAuthState();
} else {
    switchScreen(activeScreen, screens.home);
}
// After signup succeeds
await trackEvent("signed_up");
}

async function ensureProfileExists() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) return false;

    const { error } = await supabaseClient
        .from("profiles")
        .upsert({
            id: user.id,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error("Profile ensure failed:", error);
        return false;
    }

    return true;
}

async function signIn() {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    const message = document.getElementById("authMessage");

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        message.textContent = error.message;
        return;
    }

    message.textContent = "Signed in successfully.";
    await updateNavbar();
    await trySavePendingScore();
const hasCompletedTest =
    questions.length > 0 &&
    userAnswers.length === questions.length &&
    currentQuestion >= questions.length;

if (hasCompletedTest) {
    await trySavePendingScore();
    switchScreen(activeScreen, screens.result);
    await handleResultAuthState();
} else {
    switchScreen(activeScreen, screens.home);
}
}

async function loadNotificationCounts() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const forumNav = document.getElementById("navForum");
    const inboxNav = document.getElementById("inboxNavButton");

    forumNav.textContent = DEFAULT_FORUM_NAV_TEXT;
    inboxNav.textContent = DEFAULT_INBOX_NAV_TEXT;

    if (!user) return;

    const { data, error } = await supabaseClient
        .from("notifications")
        .select("type")
        .eq("user_id", user.id)
        .eq("is_read", false);

    if (error) {
        console.error("Notification count load failed:", error);
        return;
    }

    const forumCount = data.filter(n => n.type === "forum_reply").length;
    const inboxCount = data.filter(n => n.type === "direct_message").length;

    if (forumCount > 0) {
        forumNav.textContent = `${DEFAULT_FORUM_NAV_TEXT} (${forumCount})`;
    }

    if (inboxCount > 0) {
        inboxNav.textContent = `${DEFAULT_INBOX_NAV_TEXT} (${inboxCount})`;
    }
}

async function updateNavbar() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    const signInButton = document.getElementById("navAuth");
    const profileButton = document.getElementById("profileNavButton");
    const signOutButton = document.getElementById("signOutNavButton");

    if (session && session.user) {
        signInButton.classList.add("hidden");
        profileButton.classList.remove("hidden");
        signOutButton.classList.remove("hidden");
        inboxButton.classList.remove("hidden");
    } else {
        signInButton.classList.remove("hidden");
        profileButton.classList.add("hidden");
        signOutButton.classList.add("hidden");
        inboxButton.classList.add("hidden");
    }

    await loadNotificationCounts()
}

async function signOut() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Sign out failed:", error);
        return;
    }

    await updateNavbar();
    switchScreen(activeScreen, screens.home);
}

async function openProfile() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        switchScreen(activeScreen,screens.auth)
        return;
    }

    await loadProfile();
    await loadPrivateCompositeScore();
    await loadPreviousScores();
    switchScreen(activeScreen,screens.profile)

    // In openProfile()
await trackEvent("opened_profile");
}

async function loadProfile() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) return;

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Profile load failed:", error);
        return;
    }

    if (!data) return;

    document.getElementById("profileUsername").value = data.username || "";
    document.getElementById("profileDisplayName").value = data.display_name || "";
    document.getElementById("profileSchool").value = data.school || "";
    document.getElementById("profileMajor").value = data.major || "";
    document.getElementById("profileInterests").value = data.interests || "";
    document.getElementById("profileBio").value = data.bio || "";

    const trustLevel = data.trust_level || 0;

document.getElementById("privateTrustLevel").textContent =
    `Level ${trustLevel} · ${getTrustLabel(trustLevel)}`;
}

async function saveProfile() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const message = document.getElementById("profileMessage");

    if (!user) {
        message.textContent = "You must be signed in to save a profile.";
        return;
    }

    const profile = {
        id: user.id,
        username: document.getElementById("profileUsername").value.trim(),
        display_name: document.getElementById("profileDisplayName").value.trim(),
        school: document.getElementById("profileSchool").value.trim(),
        major: document.getElementById("profileMajor").value.trim(),
        interests: document.getElementById("profileInterests").value.trim(),
        bio: document.getElementById("profileBio").value.trim(),
        updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient
        .from("profiles")
        .upsert(profile);

    if (error) {
        console.error("Profile save failed:", error);
        message.textContent = error.message;
        return;
    }

    message.textContent = "Profile saved.";

    const { data: existingProfile } = await supabaseClient
    .from("profiles")
    .select("username, display_name, bio, school, major, interests")
    .eq("id", user.id)
    .maybeSingle();

const wasIncomplete =
    !existingProfile ||
    !existingProfile.username ||
    !existingProfile.display_name;

    if (wasIncomplete) {
    showNextStep({
        title: "Your profile is ready.",
        text: "Introduce yourself in the forum so other students know what you are working on.",
        primaryText: "Go to Forum",
        primaryAction: openForum,
        secondaryText: "Stay on Profile",
        secondaryAction: () => switchScreen(activeScreen, screens.profile)
    });
}
// After saveProfile succeeds
await trackEvent("updated_profile");
}

async function saveScoreToSupabase() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const message = document.getElementById("scoreSaveMessage");

    if (!user) {
        message.textContent = "Create an account to save your score.";
        return;
    }

    const { data, error } = await supabaseClient
        .rpc("grade_attempt", {
            user_answers: userAnswers
        });

    if (error) {
        console.error("Score save failed:", error);
        message.textContent = "Could not save score.";
        return;
    }

    score = data.total_score;
    sectionScores.ar = data.analytical_reasoning;
    sectionScores.ds = data.data_structures_algorithms;
    sectionScores.s = data.systems;
    sectionScores.cc = data.code_comprehension;

    const authPrompt = document.getElementById("resultAuthPrompt");

    if (authPrompt) {
        authPrompt.classList.add("hidden");
    }

    message.textContent = "Score saved to your profile.";

    await loadPreviousScores();

    // After pending score saves successfully
await trackEvent("saved_score", {
    score
});
}

async function handleResultAuthState() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const authPrompt = document.getElementById("resultAuthPrompt");
    const saveMessage = document.getElementById("scoreSaveMessage");

    if (!user) {
        authPrompt.classList.remove("hidden");
        saveMessage.textContent = "";
        return;
    }

    authPrompt.classList.add("hidden");
    saveMessage.textContent = "Score saved to your profile.";
}

async function trySavePendingScore() {
    if (scoreSavedThisSession) return;

    if (currentQuestion < questions.length) return;

    if (!userAnswers || userAnswers.length === 0) return;

    const profileReady = await ensureProfileExists();
    if (!profileReady) return;

    await saveScoreToSupabase();

    scoreSavedThisSession = true;
}

async function loadPreviousScores() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const scoresList = document.getElementById("previousScoresList");

    if (!user) {
        scoresList.innerHTML = "<p class='subtle'>Sign in to view previous scores.</p>";
        return;
    }

const { data, error } = await supabaseClient
    .from("score_percentiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

    if (error) {
        console.error("Could not load previous scores:", error);
        scoresList.innerHTML = "<p class='subtle'>Could not load previous scores.</p>";
        return;
    }

    if (!data || data.length === 0) {
        scoresList.innerHTML = "<p class='subtle'>No saved scores yet.</p>";
        return;
    }

    scoresList.innerHTML = "";

    data.forEach(scoreRow => {
        const date = new Date(scoreRow.created_at).toLocaleDateString();

        const scoreEntry = document.createElement("div");
        scoreEntry.classList.add("score-entry");

        scoreEntry.innerHTML = `
            <div class="score-entry-top">
                <strong>${scoreRow.total_score}/28 · ${scoreRow.percentile}% percentile
                <span class="score-date">${date}</span>
            </div>
            <p class="subtle">
                Analytical: ${scoreRow.analytical_reasoning}/7 ·
                DSA: ${scoreRow.data_structures_algorithms}/7 ·
                Systems: ${scoreRow.systems}/7 ·
                Code: ${scoreRow.code_comprehension}/7
            </p>
        `;

        scoresList.appendChild(scoreEntry);
    });
}

async function openPublicProfile(userId) {
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        console.error("Public profile load failed:", error);
        return;
    }

    currentPublicProfileId = userId;
    document.getElementById("publicMessageText").value = "";
    document.getElementById("publicMessageStatus").textContent = "";

    document.getElementById("publicDisplayName").textContent =
        data.display_name || data.username || "Unnamed User";

    document.getElementById("publicUsername").textContent =
        data.username ? `@${data.username}` : "";

    document.getElementById("publicSchool").textContent =
        data.school || "Not listed";

    document.getElementById("publicMajor").textContent =
        data.major || "Not listed";

    document.getElementById("publicInterests").textContent =
        data.interests || "Not listed";

    document.getElementById("publicBio").textContent =
        data.bio || "No bio yet.";

        const trustLevel = data.trust_level || 0;

document.getElementById("publicTrustLevel").textContent =
    `Level ${trustLevel} · ${getTrustLabel(trustLevel)}`;

        const compositeContainer = document.getElementById("publicCompositeScore");

const { data: compositeData, error: compositeError } = await supabaseClient
    .from("composite_percentiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

if (compositeError) {
    console.error("Public composite score load failed:", compositeError);
    compositeContainer.innerHTML = "<p class='subtle'>Could not load composite score.</p>";
} else {
    renderCompositeScore(compositeContainer, compositeData, false);
}

    switchScreen(activeScreen, screens.publicProfile);
}

async function loadLeaderboard() {
    const leaderboardList = document.getElementById("leaderboardList");

    leaderboardList.innerHTML = "<p class='subtle'>Loading leaderboard...</p>";

const { data, error } = await supabaseClient
.from("composite_percentiles")
.select(`
    *,
    profiles (
        username,
        display_name,
        school,
        major
    )
`)
.order("composite_percentile", { ascending: false })
.limit(100);

    if (error) {
        console.error("Leaderboard load failed:", error);
        leaderboardList.innerHTML = "<p class='subtle'>Could not load leaderboard.</p>";
        return;
    }

    if (!data || data.length === 0) {
        leaderboardList.innerHTML = "<p class='subtle'>No saved scores yet.</p>";
        return;
    }

    leaderboardList.innerHTML = "";

data.forEach((scoreRow, index) => {
    const profile = scoreRow.profiles;

    const name =
        profile?.display_name ||
        profile?.username ||
        "Anonymous User";

    const entry = document.createElement("div");
    entry.classList.add("leaderboard-entry");

    entry.addEventListener("click", () => {
        openPublicProfile(scoreRow.user_id);
    });

    entry.innerHTML = `
        <div class="leaderboard-rank">#${index + 1}</div>

        <div class="leaderboard-main">
            <h3>${name} — ${scoreRow.average_score}/28</h3>
            <p class="subtle">${scoreRow.composite_percentile.toFixed(2)}% composite percentile</p>
            Confidence: ${scoreRow.confidence_level}
            <p class="subtle">
                ${profile?.school || "Unknown school"} · ${profile?.major || "Unknown major"}
            </p>
            <p class="subtle">
                Analytical: ${scoreRow.average_analytical_reasoning}/7 ·
                DSA: ${scoreRow.average_data_structures_algorithms}/7 ·
                Systems: ${scoreRow.average_systems}/7 ·
                Code: ${scoreRow.average_code_comprehension}/7
            </p>
        </div>
    `;

    leaderboardList.appendChild(entry);
});
}

async function sendMessageToPublicProfile() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const status = document.getElementById("publicMessageStatus");
    const content = document.getElementById("publicMessageText").value.trim();

    if (!user) {
        status.textContent = "Sign in to send messages.";
        return;
    }

    if (!currentPublicProfileId) {
        status.textContent = "No user selected.";
        return;
    }

    if (!content) {
        status.textContent = "Message cannot be empty.";
        return;
    }

    if (user.id === currentPublicProfileId) {
        status.textContent = "You cannot message yourself.";
        return;
    }

    const { error } = await supabaseClient
        .from("messages")
        .insert({
            sender_id: user.id,
            receiver_id: currentPublicProfileId,
            content
        });

    if (error) {
        console.error("Message send failed:", error);
        status.textContent = error.message;
        return;
    }

    document.getElementById("publicMessageText").value = "";
    status.textContent = "Message sent.";

    await supabaseClient
    .from("notifications")
    .insert({
        user_id: currentPublicProfileId,
        actor_user_id: user.id,
        type: "direct_message",
        content: "You received a new message."
    });

    // After message insert succeeds
await trackEvent("sent_message");
}

async function loadInbox() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const inboxList = document.getElementById("inboxList");

    if (!user) {
        inboxList.innerHTML = "<p class='subtle'>Sign in to view your inbox.</p>";
        return;
    }

    inboxList.innerHTML = "<p class='subtle'>Loading conversations...</p>";

    const { data, error } = await supabaseClient
        .from("messages")
        .select(`
            *,
            sender:profiles!messages_sender_id_fkey (
                username,
                display_name
            ),
            receiver:profiles!messages_receiver_id_fkey (
                username,
                display_name
            )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Inbox load failed:", error);
        inboxList.innerHTML = "<p class='subtle'>Could not load inbox.</p>";
        return;
    }

    if (!data || data.length === 0) {
        inboxList.innerHTML = "<p class='subtle'>No conversations yet.</p>";
        return;
    }

    const conversations = new Map();

    data.forEach(message => {
        const otherUserId =
            message.sender_id === user.id
                ? message.receiver_id
                : message.sender_id;

        if (!conversations.has(otherUserId)) {
            const otherProfile =
                message.sender_id === user.id
                    ? message.receiver
                    : message.sender;

            conversations.set(otherUserId, {
                otherUserId,
                otherProfile,
                latestMessage: message
            });
        }
    });

    inboxList.innerHTML = "";

    conversations.forEach(convo => {
        const name =
            convo.otherProfile?.display_name ||
            convo.otherProfile?.username ||
            "Unknown User";

        const entry = document.createElement("div");
        entry.classList.add("message-entry");
        entry.classList.add("clickable-entry");

        entry.innerHTML = `
            <div class="message-header">
                <strong>${name}</strong>
                <span class="score-date">${new Date(convo.latestMessage.created_at).toLocaleDateString()}</span>
            </div>
            <p class="subtle">${convo.latestMessage.content}</p>
        `;

        entry.addEventListener("click", () => {
            openThread(convo.otherUserId, name);
        });

        inboxList.appendChild(entry);
    });
}

async function openThread(otherUserId, name) {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) return;

    currentThreadUserId = otherUserId;

    document.getElementById("threadTitle").textContent = `Conversation with ${name}`;
    document.getElementById("threadReplyText").value = "";
    document.getElementById("threadReplyStatus").textContent = "";

    const threadMessages = document.getElementById("threadMessages");
    threadMessages.innerHTML = "<p class='subtle'>Loading conversation...</p>";

    const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Thread load failed:", error);
        threadMessages.innerHTML = "<p class='subtle'>Could not load conversation.</p>";
        return;
    }

    threadMessages.innerHTML = "";

    data.forEach(message => {
        const bubble = document.createElement("div");

        const isMine = message.sender_id === user.id;

        bubble.classList.add("thread-message");
        bubble.classList.add(isMine ? "my-message" : "their-message");

        bubble.innerHTML = `
            <p>${message.content}</p>
            <span>${new Date(message.created_at).toLocaleString()}</span>
        `;

        threadMessages.appendChild(bubble);
    });

    switchScreen(activeScreen, screens.thread);
}

async function sendReply(receiverId, replyBox, replyStatus) {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        replyStatus.textContent = "You must be signed in to reply.";
        return;
    }

    const content = replyBox.value.trim();

    if (!content) {
        replyStatus.textContent = "Reply cannot be empty.";
        return;
    }

    const { error } = await supabaseClient
        .from("messages")
        .insert({
            sender_id: user.id,
            receiver_id: receiverId,
            content
        });

    if (error) {
        console.error("Reply failed:", error);
        replyStatus.textContent = error.message;
        return;
    }

    replyBox.value = "";
    replyStatus.textContent = "Reply sent.";
}

async function openInbox() {
    await markNotificationsRead("direct_message");
    await loadInbox();
    switchScreen(activeScreen, screens.inbox);
    await trackEvent("opened_inbox");
}

async function sendThreadReply() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const replyText = document.getElementById("threadReplyText");
    const status = document.getElementById("threadReplyStatus");

    if (!user) {
        status.textContent = "You must be signed in.";
        return;
    }

    const content = replyText.value.trim();

    if (!currentThreadUserId) {
        status.textContent = "No conversation selected.";
        return;
    }

    if (!content) {
        status.textContent = "Reply cannot be empty.";
        return;
    }

    const { error } = await supabaseClient
        .from("messages")
        .insert({
            sender_id: user.id,
            receiver_id: currentThreadUserId,
            content
        });

    if (error) {
        console.error("Reply failed:", error);
        status.textContent = error.message;
        return;
    }

    replyText.value = "";
    status.textContent = "Reply sent.";

    await openThread(currentThreadUserId, document.getElementById("threadTitle").textContent.replace("Conversation with ", ""));

    await supabaseClient
    .from("notifications")
    .insert({
        user_id: currentPublicProfileId,
        actor_user_id: user.id,
        type: "direct_message",
        content: "You received a new message."
    });
    // After message insert succeeds
    await trackEvent("sent_message");
}

async function loadForumPosts() {
    const postsList = document.getElementById("forumPostsList");

    postsList.innerHTML = "<p class='subtle'>Loading posts...</p>";

   let query = supabaseClient
    .from("forum_posts")
.select(`
    *,
    profiles!forum_posts_user_id_fkey (
        username,
        display_name,
        major,
        school
    )
`)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(50);

const selectedCategory = document.getElementById("forumCategoryFilter").value;

if (selectedCategory !== "All") {
    query = query.eq("category", selectedCategory);
}

const { data, error } = await query;

    if (error) {
        console.error("Forum load failed:", error);
        postsList.innerHTML = "<p class='subtle'>Could not load forum posts.</p>";
        return;
    }

    if (!data || data.length === 0) {
        postsList.innerHTML = "<p class='subtle'>No posts yet. Be the first to post.</p>";
        return;
    }

    postsList.innerHTML = "";

        const userIds = [...new Set(data.map(post => post.user_id))];

const { data: compositeRows, error: compositeError } = await supabaseClient
    .from("composite_percentiles")
    .select("user_id, average_score, composite_percentile, attempt_count")
    .in("user_id", userIds);

const compositeMap = new Map();

if (!compositeError && compositeRows) {
    compositeRows.forEach(row => {
        compositeMap.set(row.user_id, row);
    });
}

    data.forEach(post => {
        const author =
            post.profiles?.display_name ||
            post.profiles?.username ||
            "Unknown User";

        const composite = compositeMap.get(post.user_id);

const compositeBadge = composite
    ? ` · Composite: ${Number(composite.composite_percentile).toFixed(2)}%`
    : "";

        const postEl = document.createElement("div");
        postEl.classList.add("forum-post");

        postEl.classList.add("clickable-entry");

        postEl.addEventListener("click", () => {
            openForumThread(post.id);
        });

postEl.innerHTML = `
    <div class="forum-post-header">
        <div>
            <h2>${post.title}</h2>
            <p class="subtle">
                <span class="profile-link" data-user-id="${post.user_id}">
                    ${author}
                </span>
                · ${post.profiles?.major || "Unknown major"}
                ${compositeBadge}
                · ${new Date(post.created_at).toLocaleDateString()}
            </p>
        </div>
        <span class="forum-category">${post.category || "General"}</span>
    </div>

    <p>${post.content}</p>
`;

const profileLink = postEl.querySelector(".profile-link");

profileLink.addEventListener("click", (event) => {
    event.stopPropagation();
    openPublicProfile(post.user_id);
});

        postsList.appendChild(postEl);
    });
}

async function createForumPost() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const title = document.getElementById("postTitle").value.trim();
    const content = document.getElementById("postContent").value.trim();
    const message = document.getElementById("forumMessage");
    const category = document.getElementById("postCategory").value;

    if (!user) {
        message.textContent = "Sign in to create a post.";
        return;
    }

    if (!title || !content) {
        message.textContent = "Title and content are required.";
        return;
    }

    const { error } = await supabaseClient
        .from("forum_posts")
        .insert({
            user_id: user.id,
            title,
            content,
            category: category
        });

    if (error) {
        console.error("Post creation failed:", error);
        message.textContent = error.message;
        return;
    }

    document.getElementById("postTitle").value = "";
    document.getElementById("postContent").value = "";
    message.textContent = "Post created.";

    await loadForumPosts();

    // After createForumPost succeeds
await trackEvent("created_forum_post", {
    category
});
}

async function openForum() {
    await markNotificationsRead("forum_reply");
    await loadForumPosts();
    switchScreen(activeScreen, screens.forum);
}

async function openForumThread(postId) {
    currentForumPostId = postId;

    const threadPost = document.getElementById("threadPost");
    const threadComments = document.getElementById("threadComments");

    threadPost.innerHTML = "<p class='subtle'>Loading post...</p>";
    threadComments.innerHTML = "";

    const { data: post, error: postError } = await supabaseClient
        .from("forum_posts")
.select(`
    *,
    profiles!forum_posts_user_id_fkey (
        username,
        display_name,
        major,
        school
    )
`)
        .eq("id", postId)
        .single();

    if (postError) {
        console.error("Post load failed:", postError);
        threadPost.innerHTML = "<p class='subtle'>Could not load post.</p>";
        return;
    }

    const author =
        post.profiles?.display_name ||
        post.profiles?.username ||
        "Unknown User";

        const { data: composite, error: compositeError } = await supabaseClient
    .from("composite_percentiles")
    .select("user_id, average_score, composite_percentile, attempt_count")
    .eq("user_id", post.user_id)
    .maybeSingle();

if (compositeError) {
    console.error("Thread composite score load failed:", compositeError);
}

const compositeBadge = composite
    ? ` · Composite: ${Number(composite.composite_percentile).toFixed(2)}%`
    : "";

    const { data: { user } } = await supabaseClient.auth.getUser();

let isModerator = false;

if (user) {
    const { data: moderatorStatus, error: moderatorError } = await supabaseClient
        .rpc("is_moderator");

    if (!moderatorError) {
        isModerator = moderatorStatus;
    }
}

const canDeletePost =
    user &&
    (post.user_id === user.id || isModerator);

const deletePostButtonHTML = canDeletePost
    ? `
        <button class="secondary-button" onclick="hideForumPost(${post.id})">
            Delete Thread
        </button>
      `
    : "";

const displayedPostContent = post.edited_content || post.content;

const canEditPost =
    user &&
    post.user_id === user.id;

const editPostButtonHTML = canEditPost
    ? `
        <button
            class="secondary-button edit-post-button"
            data-post-id="${post.id}"
        >
            Edit Thread
        </button>
      `
    : "";

threadPost.innerHTML = `
    <div class="forum-post">
        <div class="forum-post-header">
            <div>
                <h2>${post.title}</h2>
                <p class="subtle">
                    <span class="profile-link" data-user-id="${post.user_id}">
                    ${author}
                    </span>
                     · ${post.profiles?.major || "Unknown major"}
                    ${compositeBadge}
                     · ${new Date(post.created_at).toLocaleDateString()}
                     ${post.edited_at ? " · edited" : ""}
                 </p>
            </div>
            <span class="forum-category">${post.category || "General"}</span>
        </div>

        <div id="postContent-${post.id}">
            <p>${displayedPostContent}</p>
        </div>

        <div class="comment-actions" id="postActions-${post.id}">
            ${editPostButtonHTML}
            ${deletePostButtonHTML}
        </div>
    </div>
`;

const editButton = threadPost.querySelector(".edit-post-button");

if (editButton) {
    editButton.addEventListener("click", () => {
        showEditPostUI(post.id, displayedPostContent);
    });
}

    const profileLink = threadPost.querySelector(".profile-link");

profileLink.addEventListener("click", (event) => {
    event.stopPropagation();
    openPublicProfile(post.user_id);
});

    await loadForumComments(postId);

    document.getElementById("commentContent").value = "";
    document.getElementById("commentMessage").textContent = "";

    switchScreen(activeScreen, screens.forumThread);

    // In openForum()
await trackEvent("opened_forum");
}

async function loadForumComments(postId) {
    const { data: { user } } = await supabaseClient.auth.getUser();

let isModerator = false;

if (user) {
    const { data: moderatorStatus, error: moderatorError } = await supabaseClient
        .rpc("is_moderator");

    if (!moderatorError) {
        isModerator = moderatorStatus;
    }
}


    const threadComments = document.getElementById("threadComments");

    threadComments.innerHTML = "<p class='subtle'>Loading comments...</p>";

    const { data, error } = await supabaseClient
        .from("forum_comments")
.select(`
    *,
profiles!forum_comments_user_id_fkey (
    username,
    display_name,
    major,
    school
)
`)
        .eq("post_id", postId)
        .eq("hidden", false)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Comments load failed:", error);
        threadComments.innerHTML = "<p class='subtle'>Could not load comments.</p>";
        return;
    }

    if (!data || data.length === 0) {
        threadComments.innerHTML = "<p class='subtle'>No comments yet.</p>";
        return;
    }

    threadComments.innerHTML = "";

    data.forEach(comment => {
        const author =
            comment.profiles?.display_name ||
            comment.profiles?.username ||
            "Unknown User";

        const commentEl = document.createElement("div");
        commentEl.classList.add("forum-comment");

        const canDelete =
    user &&
    (comment.user_id === user.id || isModerator);

const deleteButtonHTML = canDelete
    ? `
        <button class="secondary-button" onclick="hideForumComment(${comment.id})">
            Delete
        </button>
      `
    : "";

const displayedContent = comment.edited_content || comment.content;

const canEdit =
    user &&
    comment.user_id === user.id;

const editButtonHTML = canEdit
    ? `
        <button
            class="secondary-button edit-comment-button"
            data-comment-id="${comment.id}"
        >
            Edit
        </button>
      `
    : "";

commentEl.innerHTML = `
    <div class="message-header">
        <strong>
            <span class="profile-link" data-user-id="${comment.user_id}">
                ${author}
            </span>
        </strong>

        <span class="score-date">
            ${new Date(comment.created_at).toLocaleDateString()}
            ${comment.edited_at ? " · edited" : ""}
        </span>
    </div>

    <div id="commentContent-${comment.id}">
        <p>${displayedContent}</p>
    </div>

<div class="comment-actions" id="commentActions-${comment.id}">
    ${editButtonHTML}
    ${deleteButtonHTML}
</div>
`;

const profileLink = commentEl.querySelector(".profile-link");

profileLink.addEventListener("click", () => {
    openPublicProfile(comment.user_id);
});

        threadComments.appendChild(commentEl);

        const editButton = commentEl.querySelector(".edit-comment-button");

if (editButton) {
    editButton.addEventListener("click", () => {
        showEditCommentUI(comment.id, displayedContent);
    });
}

    });
}

async function createForumComment() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const content = document.getElementById("commentContent").value.trim();
    const message = document.getElementById("commentMessage");

    if (!user) {
        message.textContent = "Sign in to comment.";
        return;
    }

    if (!currentForumPostId) {
        message.textContent = "No post selected.";
        return;
    }

    if (!content) {
        message.textContent = "Comment cannot be empty.";
        return;
    }

    const { error } = await supabaseClient
        .from("forum_comments")
        .insert({
            post_id: currentForumPostId,
            user_id: user.id,
            content
        });

    if (error) {
        console.error("Comment failed:", error);
        message.textContent = error.message;
        return;
    }

    document.getElementById("commentContent").value = "";
    message.textContent = "Comment posted.";

    const { data: postData } = await supabaseClient
    .from("forum_posts")
    .select("user_id")
    .eq("id", currentForumPostId)
    .single();

    if (postData.user_id !== user.id) {
    await supabaseClient
        .from("notifications")
        .insert({
            user_id: postData.user_id,
            actor_user_id: user.id,
            type: "forum_reply",
            related_post_id: currentForumPostId,
            content: "Someone replied to your forum thread."
        });
}

    await loadForumComments(currentForumPostId);

    // After createForumComment succeeds
await trackEvent("created_forum_comment", {
    post_id: currentForumPostId
});
}

async function gradeAttempt() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data, error } = await supabaseClient
        .rpc("grade_attempt", {
            user_answers: userAnswers
        });

    if (error) {
        console.error("Grading failed:", error);
        return;
    }

    score = data.total_score;

    sectionScores.ar = data.analytical_reasoning;
    sectionScores.ds = data.data_structures_algorithms;
    sectionScores.s = data.systems;
    sectionScores.cc = data.code_comprehension;

    scoreSavedThisSession = !!user;

    showResults();

    // After gradeAttempt succeeds
await trackEvent("completed_test", {
    score,
    total_questions: questions.length
});
}

function renderCompositeScore(container, composite, showExplanation = false) {
    if (!composite) {
        container.innerHTML = "<p class='subtle'>No composite score yet.</p>";
        return;
    }

    let explanationHTML = "";

    if (showExplanation) {
        explanationHTML = `
            <p class="subtle">
                Confidence is based on how many recent attempts you have completed and how consistent your most recent scores are.
            </p>
        `;
    }

    container.innerHTML = `
        <div class="score-entry">
            <div class="score-entry-top">
                <strong>${Number(composite.average_score).toFixed(2)}/28</strong>
                <span class="score-date">
                    ${Number(composite.composite_percentile).toFixed(2)}% percentile
                </span>
            </div>

            <p class="subtle">
                Confidence: <strong>${composite.confidence_level}</strong>
            </p>

            <p class="subtle">
                Based on ${composite.attempt_count} recent attempt${composite.attempt_count === 1 ? "" : "s"}
                with a ${composite.score_range}-point recent score range.
            </p>

            <p class="subtle">
                Analytical: ${Number(composite.average_analytical_reasoning).toFixed(2)}/7 ·
                DSA: ${Number(composite.average_data_structures_algorithms).toFixed(2)}/7 ·
                Systems: ${Number(composite.average_systems).toFixed(2)}/7 ·
                Code: ${Number(composite.average_code_comprehension).toFixed(2)}/7
            </p>

            ${explanationHTML}
        </div>
    `;
}

async function loadPrivateCompositeScore() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const container = document.getElementById("privateCompositeScore");

    if (!user) {
        container.innerHTML = "<p class='subtle'>Sign in to view your composite score.</p>";
        return;
    }

    const { data, error } = await supabaseClient
        .from("composite_percentiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Composite score load failed:", error);
        container.innerHTML = "<p class='subtle'>Could not load composite score.</p>";
        return;
    }

    renderCompositeScore(container, data, true);
}

async function markNotificationsRead(type) {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) return;

    const { error } = await supabaseClient
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("type", type)
        .eq("is_read", false);

    if (error) {
        console.error("Mark notifications read failed:", error);
        return;
    }

    await updateNavbar();
}

async function trackEvent(eventType, metadata = {}) {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
        .from("analytics_events")
        .insert({
            user_id: user ? user.id : null,
            event_type: eventType,
            metadata
        });

    if (error) {
        console.error("Analytics event failed:", error);
    }
}

function showNextStep({ title, text, primaryText, primaryAction, secondaryText, secondaryAction }) {
    document.getElementById("nextStepTitle").textContent = title;
    document.getElementById("nextStepText").textContent = text;

    const primaryButton = document.getElementById("nextStepPrimaryButton");
    const secondaryButton = document.getElementById("nextStepSecondaryButton");

    primaryButton.textContent = primaryText;
    secondaryButton.textContent = secondaryText;

    primaryButton.onclick = primaryAction;
    secondaryButton.onclick = secondaryAction;

    switchScreen(activeScreen, screens.nextStep);
}

async function hideForumComment(commentId) {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert("You must be signed in to delete comments.");
        return;
    }
const { data, error } = await supabaseClient
    .from("forum_comments")
    .update({
        hidden: true,
        hidden_at: new Date().toISOString(),
        hidden_by: user.id
    })
    .eq("id", commentId)
    .select();

if (error) {
    console.error("Comment delete failed:", error);
    alert("You do not have permission to delete this comment.");
    return;
}

if (!data || data.length === 0) {
    alert("You do not have permission to delete this comment.");
    return;
}

await loadForumComments(currentForumPostId);
}

async function hideForumPost(postId) {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert("You must be signed in to delete posts.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("forum_posts")
        .update({
            hidden: true,
            hidden_at: new Date().toISOString(),
            hidden_by: user.id
        })
        .eq("id", postId)
        .select();

    if (error) {
        console.error("Post delete failed:", error);
        alert("You do not have permission to delete this post.");
        return;
    }

    if (!data || data.length === 0) {
        alert("You do not have permission to delete this post.");
        return;
    }

    await openForum();
}

function getTrustLabel(level) {
    if (level >= 4) return "Veteran";
    if (level === 3) return "Contributor";
    if (level === 2) return "Active Member";
    if (level === 1) return "New Member";
    return "Unranked";
}

async function editForumComment(commentId) {
    const textarea = document.getElementById(`editTextarea-${commentId}`);

    if (!textarea) {
        alert("Could not find edit box.");
        return;
    }

    const trimmedContent = textarea.value.trim();

    if (!trimmedContent) {
        alert("Comment cannot be empty.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("forum_comments")
        .update({
            edited_content: trimmedContent,
            edited_at: new Date().toISOString()
        })
        .eq("id", commentId)
        .select();

    if (error || !data || data.length === 0) {
        console.error("Comment edit failed:", error);
        alert("You do not have permission to edit this comment.");
        return;
    }

    await loadForumComments(currentForumPostId);
}

async function editForumPost(postId) {
    const textarea = document.getElementById(`editPostTextarea-${postId}`);

    if (!textarea) {
        alert("Could not find edit box.");
        return;
    }

    const trimmedContent = textarea.value.trim();

    if (!trimmedContent) {
        alert("Post cannot be empty.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("forum_posts")
        .update({
            edited_content: trimmedContent,
            edited_at: new Date().toISOString()
        })
        .eq("id", postId)
        .select();

    if (error || !data || data.length === 0) {
        console.error("Post edit failed:", error);
        alert("You do not have permission to edit this post.");
        return;
    }

    await openForumThread(postId);
}

function showEditCommentUI(commentId, currentContent) {
    const contentEl = document.getElementById(`commentContent-${commentId}`);
    const actionsEl = document.getElementById(`commentActions-${commentId}`);

    if (!contentEl) return;

    if (actionsEl) {
        actionsEl.classList.add("hidden");
    }

    contentEl.innerHTML = `
        <textarea id="editTextarea-${commentId}" class="comment-edit-box">${currentContent}</textarea>

        <div class="edit-actions">
            <button class="secondary-button" onclick="editForumComment(${commentId})">
                Save
            </button>

            <button class="secondary-button" onclick="loadForumComments(currentForumPostId)">
                Cancel
            </button>
        </div>
    `;
}

function showEditPostUI(postId, currentContent) {
    const contentEl = document.getElementById(`postContent-${postId}`);
    const actionsEl = document.getElementById(`postActions-${postId}`);

    if (!contentEl) return;

    if (actionsEl) {
        actionsEl.classList.add("hidden");
    }

    contentEl.innerHTML = `
        <textarea id="editPostTextarea-${postId}" class="comment-edit-box">${currentContent}</textarea>

        <div class="edit-actions">
            <button class="secondary-button" onclick="editForumPost(${postId})">
                Save
            </button>

            <button class="secondary-button" onclick="openForumThread(${postId})">
                Cancel
            </button>
        </div>
    `;
}

const screens = {
    home: document.getElementById("homeScreen"),
    test: document.getElementById("testScreen"),
    section: document.getElementById("sectionScreen"),
    result: document.getElementById("resultScreen"),
    leaderboard: document.getElementById("leaderboardScreen"),
    auth: document.getElementById("authScreen"),
    profile: document.getElementById("profileScreen"),
    publicProfile: document.getElementById("publicProfileScreen"),
    inbox: document.getElementById("inboxScreen"),
    thread: document.getElementById("threadScreen"),
    forum: document.getElementById("forumScreen"),
    forumThread: document.getElementById("forumThreadScreen"),
    nextStep: document.getElementById("nextStepScreen")
};

let activeScreen = screens.home;

document.getElementById("nextButton")
.addEventListener("click", function() {
    console.log("Button clicked");
    if (selectedAnswer === null) {
    alert("Please select an answer.");
    return;
}
userAnswers.push({
    question_id: questions[currentQuestion].id,
    selected_answer: selectedAnswer
});

    currentQuestion++;

    if (currentQuestion < questions.length) {
        loadQuestion();
        selectedAnswer = null;
    }
    else {
    switchScreen(screens.test, screens.result, () => gradeAttempt());
    return;
    }
    const newSection = getCurrentSection();
console.log("Previous:", previousSection);
console.log("New:", newSection);
console.log("Current Question:", currentQuestion);

    if (newSection !== previousSection) {
        previousSection = newSection;
        currentSectionIndex++
switchScreen(screens.test, screens.section, () => {
    showSection(currentSectionIndex);
});

        return;
    }
});

document.getElementById("continueButton")
.addEventListener("click", function() {
    switchScreen(screens.section, screens.test, () => {
        loadQuestion(false);
    });
});

document.getElementById("restartButton")
.addEventListener("click", function() {

    currentQuestion = 0;
    currentSectionIndex = 0;
    previousSection = "ar";

    score = 0;
    selectedAnswer = null;

    sectionScores.ar = 0;
    sectionScores.ds = 0;
    sectionScores.s = 0;
    sectionScores.cc = 0;

    switchScreen(screens.result, screens.home);
    scoreSavedThisSession = false;
});

document.getElementById("navQuiz")
.addEventListener("click", () => {
    switchScreen(activeScreen, screens.home);
});

document.getElementById("navLeaderboard")
.addEventListener("click", () => {
    loadLeaderboard();
    switchScreen(activeScreen, screens.leaderboard);
});

document.getElementById("navAuth")
.addEventListener("click", () => {
    switchScreen(activeScreen, screens.auth);
});

document.getElementById("profileNavButton")
.addEventListener("click", () => {
    openProfile();
});

document.getElementById("signOutNavButton")
.addEventListener("click", () => {
    signOut();
});

document.getElementById("navForum")
.addEventListener("click", openForum);

document.getElementById("inboxNavButton")
.addEventListener("click", openInbox);
