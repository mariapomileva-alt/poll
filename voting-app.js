import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_PASSWORD } from "./config.js";

const adminView = document.getElementById("adminView");
const voteView = document.getElementById("voteView");

const pollForm = document.getElementById("pollForm");
const questionInput = document.getElementById("questionInput");
const optionsContainer = document.getElementById("optionsContainer");
const addOptionBtn = document.getElementById("addOptionBtn");
const pollFormMessage = document.getElementById("pollFormMessage");
const adminGate = document.getElementById("adminGate");
const adminGateForm = document.getElementById("adminGateForm");
const adminPasswordInput = document.getElementById("adminPasswordInput");
const adminGateMessage = document.getElementById("adminGateMessage");

const currentPollEmpty = document.getElementById("currentPollEmpty");
const currentPollActive = document.getElementById("currentPollActive");
const currentQuestion = document.getElementById("currentQuestion");
const currentOptionsCount = document.getElementById("currentOptionsCount");
const shareLink = document.getElementById("shareLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const qrCodeImage = document.getElementById("qrCodeImage");
const qrCodeFallback = document.getElementById("qrCodeFallback");
const resultsChart = document.getElementById("resultsChart");
const responsesList = document.getElementById("responsesList");
const totalVotes = document.getElementById("totalVotes");
const deletePollBtn = document.getElementById("deletePollBtn");

const voteQuestion = document.getElementById("voteQuestion");
const voteSubtitle = document.getElementById("voteSubtitle");
const voteContent = document.getElementById("voteContent");
const voteForm = document.getElementById("voteForm");
const voteOptions = document.getElementById("voteOptions");
const voteMessage = document.getElementById("voteMessage");
const voteSuccess = document.getElementById("voteSuccess");
const voteMissing = document.getElementById("voteMissing");
const identityInput = document.getElementById("identityInput");
const adminLink = document.getElementById("adminLink");
const thankYouView = document.getElementById("thankYouView");
const backToVoteBtn = document.getElementById("backToVoteBtn");
const brandHome = document.getElementById("brandHome");

const params = new URLSearchParams(window.location.search);
const adminMode = params.has("admin") || !params.get("poll");

const baseUrl = window.location.origin === "null"
    ? window.location.href.split("?")[0].split("#")[0]
    : `${window.location.origin}${window.location.pathname}`;

const initialOptionCount = 3;
const maxOptionCount = 5;
const POLL_SLUG_LENGTH = 7;
const ADMIN_LAST_POLL_KEY = "votingApp.lastPollSlug";
const ADMIN_AUTH_KEY = "votingApp.adminAuthed";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const createOptionRow = (value = "") => {
    const row = document.createElement("div");
    row.className = "option-row";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Answer option";
    input.value = value;
    input.required = true;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
        if (optionsContainer.children.length > initialOptionCount) {
            row.remove();
            updateOptionButtons();
        }
    });

    row.append(input, removeBtn);
    return row;
};

const updateOptionButtons = () => {
    const rows = optionsContainer.querySelectorAll(".option-row");
    rows.forEach((row, index) => {
        const button = row.querySelector("button");
        button.disabled = rows.length <= initialOptionCount;
        button.style.opacity = rows.length <= initialOptionCount ? "0.4" : "1";
        button.setAttribute("aria-label", `Remove option ${index + 1}`);
    });
    addOptionBtn.disabled = rows.length >= maxOptionCount;
};

const showAdminView = () => {
    adminView.classList.remove("hidden");
    voteView.classList.add("hidden");
    thankYouView.classList.add("hidden");
};

const showVoteView = () => {
    voteView.classList.remove("hidden");
    adminView.classList.add("hidden");
    thankYouView.classList.add("hidden");
};

const showThankYouView = () => {
    thankYouView.classList.remove("hidden");
    voteView.classList.add("hidden");
    adminView.classList.add("hidden");
};

const generateSlug = () => {
    return Math.random().toString(36).slice(2, 2 + POLL_SLUG_LENGTH);
};

const saveLastPollSlug = (slug) => {
    localStorage.setItem(ADMIN_LAST_POLL_KEY, slug);
};

const getLastPollSlug = () => localStorage.getItem(ADMIN_LAST_POLL_KEY);

const getPollParam = () => new URLSearchParams(window.location.search).get("poll");

const fetchPollBySlug = async (slug) => {
    const { data: poll, error } = await supabase
        .from("polls")
        .select("id, question, slug, created_at")
        .eq("slug", slug)
        .single();

    if (error) {
        return null;
    }

    const { data: options } = await supabase
        .from("options")
        .select("id, label")
        .eq("poll_id", poll.id)
        .order("label", { ascending: true });

    return { ...poll, options: options || [] };
};

const fetchResponses = async (pollId) => {
    const { data } = await supabase
        .from("responses")
        .select("id, identity, identity_type, option_id, created_at")
        .eq("poll_id", pollId)
        .order("created_at", { ascending: false });
    return data || [];
};

const renderResults = (poll, responses) => {
    const counts = poll.options.map((option) => ({
        ...option,
        count: responses.filter((response) => response.option_id === option.id).length,
    }));
    const total = responses.length;

    resultsChart.innerHTML = "";
    counts.forEach((item) => {
        const row = document.createElement("div");
        row.className = "chart-row";
        const label = document.createElement("div");
        label.textContent = item.label;
        const bar = document.createElement("div");
        bar.className = "chart-bar";
        const fill = document.createElement("div");
        fill.className = "chart-fill";
        fill.style.width = total ? `${(item.count / total) * 100}%` : "0%";
        bar.appendChild(fill);
        const value = document.createElement("div");
        value.textContent = item.count;
        row.append(label, bar, value);
        resultsChart.appendChild(row);
    });

    responsesList.innerHTML = "";
    responses.forEach((response) => {
        const option = poll.options.find((item) => item.id === response.option_id);
        const li = document.createElement("li");
        li.textContent = `${response.identity} — ${option ? option.label : "Unknown"}`;
        responsesList.appendChild(li);
    });

    totalVotes.textContent = `${total} vote${total === 1 ? "" : "s"}`;
};

const renderCurrentPoll = async (slug) => {
    if (!slug) {
        currentPollEmpty.classList.remove("hidden");
        currentPollActive.classList.add("hidden");
        return;
    }

    const poll = await fetchPollBySlug(slug);
    if (!poll) {
        currentPollEmpty.classList.remove("hidden");
        currentPollActive.classList.add("hidden");
        return;
    }

    currentPollEmpty.classList.add("hidden");
    currentPollActive.classList.remove("hidden");
    currentQuestion.textContent = poll.question;
    currentOptionsCount.textContent = `${poll.options.length} options`;

    shareLink.value = `${baseUrl}?poll=${poll.slug}`;
    if (qrCodeImage) {
        const encoded = encodeURIComponent(shareLink.value);
        qrCodeImage.onload = () => {
            qrCodeImage.classList.remove("hidden");
            qrCodeFallback?.classList.add("hidden");
        };
        qrCodeImage.onerror = () => {
            qrCodeImage.classList.add("hidden");
            qrCodeFallback?.classList.remove("hidden");
        };
        qrCodeImage.src = `https://quickchart.io/qr?text=${encoded}&size=180`;
    }
    const responses = await fetchResponses(poll.id);
    renderResults(poll, responses);
};

const setupVoteView = async () => {
    const poll = await fetchPollBySlug(getPollParam());
    if (!poll) {
        voteMissing.classList.remove("hidden");
        voteContent.classList.add("hidden");
        voteQuestion.textContent = "Poll not found";
        voteSubtitle.textContent = "Check the link or create a new poll.";
        return;
    }

    voteQuestion.textContent = poll.question;
    voteOptions.innerHTML = "";
    poll.options.forEach((option, index) => {
        const label = document.createElement("label");
        label.className = "vote-option";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "voteOption";
        input.value = option.id;
        input.required = true;
        if (index === 0) {
            input.checked = true;
        }
        const span = document.createElement("span");
        span.textContent = option.label;
        label.append(input, span);
        voteOptions.appendChild(label);
    });

    voteForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        voteMessage.textContent = "";

        const identity = identityInput.value.trim();
        if (!identity) {
            voteMessage.textContent = "Enter your name or email.";
            return;
        }

        const selected = voteForm.querySelector("input[name='voteOption']:checked");
        if (!selected) {
            voteMessage.textContent = "Select an answer option.";
            return;
        }

        const identityType = voteForm.querySelector("input[name='identityType']:checked").value;
        const { error } = await supabase.from("responses").insert({
            poll_id: poll.id,
            option_id: selected.value,
            identity,
            identity_type: identityType,
        });

        if (error) {
            voteMessage.textContent = "Something went wrong. Try again.";
            return;
        }

        voteSuccess.classList.remove("hidden");
        voteContent.classList.add("hidden");
        showThankYouView();
    });
};

const setupIdentityToggle = () => {
    const radios = document.querySelectorAll("input[name='identityType']");
    radios.forEach((radio) => {
        radio.addEventListener("change", () => {
            if (radio.checked && radio.value === "email") {
                identityInput.type = "email";
                identityInput.placeholder = "Your email";
            } else if (radio.checked) {
                identityInput.type = "text";
                identityInput.placeholder = "Your name";
            }
            identityInput.value = "";
            identityInput.focus();
        });
    });
};

const initAdminForm = () => {
    optionsContainer.innerHTML = "";
    for (let i = 0; i < initialOptionCount; i += 1) {
        optionsContainer.appendChild(createOptionRow());
    }
    updateOptionButtons();

    addOptionBtn.addEventListener("click", () => {
        if (optionsContainer.children.length < maxOptionCount) {
            optionsContainer.appendChild(createOptionRow());
            updateOptionButtons();
        }
    });

    pollForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        pollFormMessage.textContent = "";

        const question = questionInput.value.trim();
        const optionInputs = Array.from(optionsContainer.querySelectorAll("input"));
        const options = optionInputs.map((input) => input.value.trim()).filter(Boolean);

        if (!question) {
            pollFormMessage.textContent = "Enter a question.";
            return;
        }

        if (options.length < initialOptionCount || options.length > maxOptionCount) {
            pollFormMessage.textContent = "Add 3 to 5 options.";
            return;
        }

        const shouldReplace = getPollParam()
            ? window.confirm("Replace the current poll with a new one?")
            : true;

        if (!shouldReplace) {
            return;
        }

        let slug = generateSlug();
        let poll = null;
        let lastError = null;

        for (let attempt = 0; attempt < 5; attempt += 1) {
            const { data, error } = await supabase
                .from("polls")
                .insert({ question, slug })
                .select()
                .single();

            if (!error) {
                poll = data;
                break;
            }
            lastError = error;
            slug = generateSlug();
        }

        if (!poll) {
            const details = lastError?.message ? ` ${lastError.message}` : "";
            pollFormMessage.textContent = `Could not create poll. Try again.${details}`;
            return;
        }

        const optionRows = options.map((label) => ({ poll_id: poll.id, label }));
        const { error: optionsError } = await supabase.from("options").insert(optionRows);
        if (optionsError) {
            const details = optionsError?.message ? ` ${optionsError.message}` : "";
            pollFormMessage.textContent = `Could not save options. Try again.${details}`;
            return;
        }

        saveLastPollSlug(poll.slug);
        window.history.replaceState({}, "", `${baseUrl}?admin=1&poll=${poll.slug}`);

        questionInput.value = "";
        optionsContainer.innerHTML = "";
        for (let i = 0; i < initialOptionCount; i += 1) {
            optionsContainer.appendChild(createOptionRow());
        }
        updateOptionButtons();
        renderCurrentPoll(poll.slug);
    });

    copyLinkBtn.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(shareLink.value);
        } catch (error) {
            shareLink.select();
            document.execCommand("copy");
        }
        copyLinkBtn.textContent = "Copied";
        setTimeout(() => {
            copyLinkBtn.textContent = "Copy";
        }, 1500);
    });

    deletePollBtn.addEventListener("click", async () => {
        const slug = getPollParam() || getLastPollSlug();
        if (!slug) {
            return;
        }

        const shouldDelete = window.confirm("Delete this poll and all responses?");
        if (!shouldDelete) {
            return;
        }

        const poll = await fetchPollBySlug(slug);
        if (!poll) {
            return;
        }

        await supabase.from("polls").delete().eq("id", poll.id);
        localStorage.removeItem(ADMIN_LAST_POLL_KEY);
        window.history.replaceState({}, "", `${baseUrl}?admin=1`);
        renderCurrentPoll(null);
    });
};

const unlockAdmin = () => {
    localStorage.setItem(ADMIN_AUTH_KEY, "true");
    adminGate.classList.add("hidden");
    document.querySelector(".grid")?.classList.remove("hidden");
};

const setupAdminGate = () => {
    const grid = document.querySelector(".grid");
    const isAuthed = localStorage.getItem(ADMIN_AUTH_KEY) === "true";
    if (isAuthed) {
        adminGate.classList.add("hidden");
        grid?.classList.remove("hidden");
        return;
    }

    adminGate.classList.remove("hidden");
    grid?.classList.add("hidden");

    adminGateForm.addEventListener("submit", (event) => {
        event.preventDefault();
        adminGateMessage.textContent = "";

        if (!ADMIN_PASSWORD || ADMIN_PASSWORD === "CHANGE_ME") {
            adminGateMessage.textContent = "Set ADMIN_PASSWORD in config.js.";
            return;
        }

        if (adminPasswordInput.value.trim() !== ADMIN_PASSWORD) {
            adminGateMessage.textContent = "Wrong password.";
            return;
        }

        adminPasswordInput.value = "";
        unlockAdmin();
    });
};

if (adminMode) {
    showAdminView();
    setupAdminGate();
    initAdminForm();
    const initialSlug = getPollParam() || getLastPollSlug();
    renderCurrentPoll(initialSlug);
    setInterval(() => {
        const activeSlug = getPollParam() || getLastPollSlug();
        renderCurrentPoll(activeSlug);
    }, 4000);
} else {
    showVoteView();
    if (adminLink) {
        adminLink.classList.add("hidden");
    }
    if (backToVoteBtn) {
        backToVoteBtn.addEventListener("click", () => {
            window.location.reload();
        });
    }
    setupIdentityToggle();
    setupVoteView();
}

if (brandHome && adminMode) {
    brandHome.addEventListener("click", () => {
        window.location.href = `${baseUrl}?admin=1`;
    });
}

if (brandHome && !adminMode) {
    brandHome.addEventListener("click", () => {
        window.location.href = `${baseUrl}?admin=1`;
    });
    brandHome.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            window.location.href = `${baseUrl}?admin=1`;
        }
    });
}
