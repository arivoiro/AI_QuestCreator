// On importe la bibliothèque Web LLM directement
import { CreateWebWorkerMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

// Modèle d'IA que nous allons utiliser.
const SELECTED_MODEL = "gemma-2b-it-q4f16_1";

document.addEventListener("DOMContentLoaded", async () => {
    // --- ÉLÉMENTS DU DOM ---
    const generateBtn = document.getElementById("generate-btn");
    const loadingDiv = document.getElementById("loading");
    const historyList = document.getElementById("history-list");
    const questDisplayWrapper = document.getElementById("quest-display-wrapper");
    const inputElement = document.getElementById("user-input");
    const modalOverlay = document.getElementById("modal-overlay");
    const modalBox = document.getElementById("modal-box");
    const refineInput = document.getElementById("refine-input");
    const confirmRefineBtn = document.getElementById("confirm-refine-btn");
    const cancelRefineBtn = document.getElementById("cancel-refine-btn");
    const themeSelector = document.getElementById("theme-selector");
    const titleIcon = document.getElementById("title-icon");

    // --- MOTEUR WEB LLM ---
    const engine = await CreateWebWorkerMLCEngine(
        new Worker(
            new URL('./worker.js', import.meta.url),
            { type: 'module' }
        ),
        SELECTED_MODEL,
        { 
            initProgressCallback: (progress) => {
                loadingDiv.textContent = `Chargement du moteur IA... ${Math.floor(progress.progress * 100)}%`;
                loadingDiv.classList.remove('hidden');
                generateBtn.disabled = true;
            }
        }
    );
    loadingDiv.classList.add('hidden');
    generateBtn.disabled = false;
    
    // --- DONNÉES DE THÈME ---
    const themeData = {
        fantasy: {
            icon: '⚔️',
            instruction: "Tu es un scénariste de jeu vidéo de type Fantasy.",
            reinterpretation_example: "Si le concept est 'un voleur de bijoux', transforme-le en 'un artefact ancien, la 'Pierre d'Âme', a été dérobé à un ordre de mages'."
        },
        cyberpunk: {
            icon: '🤖',
            instruction: "Tu es un 'Fixer' dans une métropole néon.",
            reinterpretation_example: "Si le concept est 'un voleur de bijoux', transforme-le en 'une puce de données contenant la conscience d'une IA a été volée à la corporation OmniCorp'."
        },
        'sci-fi': {
            icon: '🚀',
            instruction: "Tu es un explorateur interstellaire.",
            reinterpretation_example: "Si le concept est 'un voleur de bijoux', transforme-le en 'un cristal d'énergie xéno-technologique, essentiel à la survie de la colonie, a disparu'."
        },
        horror: {
            icon: '🐙',
            instruction: "Tu es un maître de l'horreur cosmique lovecraftienne.",
            reinterpretation_example: "Si le concept est 'un voleur de bijoux', transforme-le en 'une étrange gemme non-euclidienne qui murmure des vérités insoutenables a été dérobée à un culte secret'."
        }
    };

    // --- "BASE DE DONNÉES" LOCALE ---
    let quests = [];
    let activeQuestId = null;

    // --- GESTION DES DONNÉES ---
    const saveQuests = () => localStorage.setItem("questHistory", JSON.stringify(quests));
    const loadQuests = () => {
        const saved = localStorage.getItem("questHistory");
        quests = saved ? JSON.parse(saved) : [];
        renderHistory();
    };

    // --- AFFICHAGE ---
    const renderHistory = () => {
        historyList.innerHTML = "";
        quests.forEach(quest => {
            const wrapper = document.createElement("div");
            wrapper.className = "history-item-wrapper";
            const item = document.createElement("div");
            item.className = "history-item";
            item.dataset.id = quest.id;
            item.textContent = quest.titre; 
            if (quest.id === activeQuestId) item.classList.add("active");
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn";
            deleteBtn.dataset.id = quest.id;
            deleteBtn.innerHTML = "×";
            wrapper.appendChild(item);
            wrapper.appendChild(deleteBtn);
            historyList.appendChild(wrapper);
        });
    };

    const displayQuest = (id) => {
        questDisplayWrapper.innerHTML = "";
        const quest = quests.find(q => q.id === id);

        if (!quest) {
            questDisplayWrapper.innerHTML = `<p class="placeholder">Générez une quête ou sélectionnez-en une.</p>`;
            activeQuestId = null;
            renderHistory();
            return;
        }

        const questCard = document.createElement('div');
        questCard.id = 'quest-card';

        const dialogueHTML = (quest.dialogues || []).map(dialogueLine => `<li><em>"${dialogueLine}"</em></li>`).join('');
        
        const pnjHTML = (quest.pnj || []).map(p => {
            let pnjText = p;
            if (typeof p === 'object' && p !== null) {
                pnjText = p.nom ? `${p.nom} - ${p.role || ''}` : JSON.stringify(p);
            }
            return `<li>${pnjText}</li>`;
        }).join('');

        const objectifsHTML = (quest.objectifs || []).map(o => `<li>${o}</li>`).join('');

        questCard.innerHTML = `
            <h2 class="quest-title">${quest.titre || "Titre non généré"}</h2>
            <hr class="separator" />
            <strong>📝 Résumé :</strong><p>${quest.résumé || "Aucun résumé."}</p>
            <strong>🎯 Objectifs :</strong><ul>${objectifsHTML}</ul>
            <strong>🎭 PNJ Clés :</strong><ul>${pnjHTML}</ul>
            <strong>🔍 Rebondissement :</strong><p>${quest.twist || "Aucun rebondissement."}</p>
            <strong>🗣️ Lignes de Dialogue Clés :</strong><ul>${dialogueHTML}</ul>
            <strong>🎁 Récompense :</strong><p>${quest.récompense || "Aucune récompense."}</p>
        `;

        const actionsSidebar = document.createElement('div');
        actionsSidebar.id = 'quest-actions-sidebar';
        actionsSidebar.innerHTML = `
            <button class="quest-action-btn" id="refine-btn">✨ Raffiner</button>
            <button class="quest-action-btn" id="export-btn"></> Exporter JSON</button>
        `;

        questDisplayWrapper.appendChild(questCard);
        questDisplayWrapper.appendChild(actionsSidebar);

        actionsSidebar.querySelector('#export-btn').addEventListener('click', () => handleExportClick(id));
        actionsSidebar.querySelector('#refine-btn').addEventListener('click', () => openRefineModal(id));
        
        activeQuestId = id;
        renderHistory();
    };
    
    // --- GESTION DE LA MODALE ET DU THÈME ---
    const openRefineModal = (id) => {
        modalBox.dataset.questId = id;
        modalOverlay.classList.remove('modal-hidden');
        refineInput.focus();
    };
    const closeRefineModal = () => {
        modalOverlay.classList.add('modal-hidden');
        refineInput.value = '';
    };
    const updateThemeIcon = () => {
        const selectedTheme = themeSelector.value;
        titleIcon.textContent = themeData[selectedTheme].icon;
    };

    // --- LOGIQUE D'ACTION ---
    const handleExportClick = (id) => {
        const quest = quests.find(q => q.id === id);
        if (!quest) return;
        const btn = document.querySelector('#quest-actions-sidebar #export-btn');
        navigator.clipboard.writeText(JSON.stringify(quest, null, 2)).then(() => {
            btn.innerHTML = `<span>Copié !</span>`;
            btn.classList.add('success');
            setTimeout(() => {
                btn.innerHTML = `</> Exporter JSON`;
                btn.classList.remove('success');
            }, 2000);
        });
    };

    const executeRefinement = async () => {
        const id = parseInt(modalBox.dataset.questId);
        const quest = quests.find(q => q.id === id);
        const refinementInstruction = refineInput.value.trim();
        if (!quest || !refinementInstruction) {
            closeRefineModal();
            return;
        }
        closeRefineModal();
        loadingDiv.textContent = "Raffinage en cours...";
        loadingDiv.classList.remove("hidden");
        generateBtn.disabled = true;

        const selectedTheme = quest.theme || 'fantasy';
        const themeInfo = themeData[selectedTheme];

        const refinePrompt = `INSTRUCTION: Tu es un ${themeInfo.instruction}. Ta mission est de modifier la quête en JSON ci-dessous en suivant l'instruction de l'utilisateur. Tu dois respecter le thème et le formatage.\n\nQUÊTE ORIGINALE:\n${JSON.stringify(quest, null, 2)}\n\nINSTRUCTION DE RAFFINEMENT: "${refinementInstruction}"\n\nRENVOIE UNIQUEMENT LA NOUVELLE VERSION COMPLÈTE DU JSON.`;
        
        try {
            const reply = await engine.chat.completions.create({
                messages: [{ role: "user", content: refinePrompt }],
            });
            const refinedQuestData = JSON.parse(reply.choices[0].message.content);
            const questIndex = quests.findIndex(q => q.id === id);
            if (questIndex !== -1) {
                refinedQuestData.id = quest.id;
                refinedQuestData.theme = selectedTheme;
                quests[questIndex] = refinedQuestData;
                saveQuests();
                displayQuest(id);
            }
        } catch(err) { 
            alert(`Erreur de raffinage: ${err.message}`); 
        } finally {
            loadingDiv.classList.add("hidden");
            generateBtn.disabled = false;
        }
    };

    const handleGenerateClick = async () => {
        const concept = inputElement.value.trim();
        if (!concept) return;
        loadingDiv.textContent = "Création en cours...";
        loadingDiv.classList.remove("hidden");
        generateBtn.disabled = true;

        const selectedTheme = themeSelector.value;
        const themeInfo = themeData[selectedTheme];

        const questPrompt = `
          INSTRUCTION: Tu es un ${themeInfo.instruction}.
          Ta mission la plus importante est de prendre le concept de l'utilisateur et de le RÉINTERPRÉTER COMPLÈTEMENT à travers le prisme de ton thème. Priorise toujours le thème sur le concept littéral.
          EXEMPLE DE RÉINTERPRÉTATION: ${themeInfo.reinterpretation_example}.

          Génère une quête détaillée en suivant ce modèle. TA RÉPONSE DOIT ÊTRE UNIQUEMENT UN BLOC DE CODE JSON VALIDE.
          
          Format JSON attendu (RÈGLE IMPORTANTE: les chaînes de caractères dans la liste "pnj" NE DOIVENT PAS contenir de tiret de liste):
          {
            "titre": "Un titre de quête court et percutant.",
            "résumé": "Un résumé narratif immersif.",
            "objectifs": ["Une liste d'objectifs clairs."],
            "pnj": ["Elara, la gardienne du temple", "Kael, le marchand méfiant"],
            "dialogues": [
                "Une première ligne de dialogue clé.",
                "Une seconde ligne de dialogue clé."
            ],
            "twist": "Un rebondissement inattendu.",
            "récompense": "Une récompense thématique."
          }

          CONCEPT UTILISATEUR À RÉINTERPRÉTER: "${concept}"
        `;

        try {
            const reply = await engine.chat.completions.create({
                messages: [{ "role": "user", "content": questPrompt }]
            });
            const newQuest = JSON.parse(reply.choices[0].message.content);
            
            newQuest.id = Date.now();
            newQuest.theme = selectedTheme;
            quests.unshift(newQuest);
            
            saveQuests();
            displayQuest(newQuest.id);
            inputElement.value = "";
        } catch (err) {
            if (err instanceof SyntaxError) {
                alert("Erreur: L'IA a renvoyé un JSON invalide. Veuillez réessayer.");
            } else {
                alert(`Une erreur est survenue: ${err.message}`);
            }
        } finally {
            loadingDiv.classList.add("hidden");
            generateBtn.disabled = false;
        }
    };
    
    const handleHistoryClick = (event) => {
        const target = event.target;
        if (target.matches('.delete-btn')) {
            event.stopPropagation();
            const idToDelete = parseInt(target.dataset.id);
            quests = quests.filter(q => q.id !== idToDelete);
            saveQuests();
            if (activeQuestId === idToDelete) {
                activeQuestId = null;
                displayQuest(null);
            }
            renderHistory();
        } else {
            const historyItem = target.closest('.history-item');
            if (historyItem) {
                const idToDisplay = parseInt(historyItem.dataset.id);
                const quest = quests.find(q => q.id === idToDisplay);
                if (quest && quest.theme) {
                    themeSelector.value = quest.theme;
                    updateThemeIcon();
                }
                displayQuest(idToDisplay);
            }
        }
    };

    // --- ÉCOUTEURS ET DÉMARRAGE ---
    generateBtn.addEventListener("click", handleGenerateClick);
    historyList.addEventListener("click", handleHistoryClick);
    cancelRefineBtn.addEventListener('click', closeRefineModal);
    confirmRefineBtn.addEventListener('click', executeRefinement);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeRefineModal();
    });
themeSelector.addEventListener('change', updateThemeIcon);
    
    loadQuests();
    displayQuest(null);
});