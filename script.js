document.addEventListener("DOMContentLoaded", () => {
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

    // --- FONCTION UTILITAIRE DE NETTOYAGE ---
    const extractJson = (rawText) => {
        const startIndex = rawText.indexOf('{');
        const endIndex = rawText.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1) {
            throw new Error("Aucun bloc JSON n'a été trouvé dans la réponse de l'IA.");
        }
        return rawText.substring(startIndex, endIndex + 1);
    };

    // --- UTILITAIRE POUR L'ÉDITION ---
    const setNestedValue = (obj, path, value) => {
        const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
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

        const dialogueHTML = (quest.dialogues || []).map((line, index) => `<li class="editable-field" data-path="dialogues[${index}]"><em>"${line}"</em></li>`).join('');
        const pnjHTML = (quest.pnj || []).map((pnj, index) => `<li class="editable-field" data-path="pnj[${index}]">${pnj}</li>`).join('');
        const objectifsHTML = (quest.objectifs || []).map((obj, index) => `<li class="editable-field" data-path="objectifs[${index}]">${obj}</li>`).join('');

        questCard.innerHTML = `
            <h2 class="quest-title editable-field" data-path="titre">${quest.titre || "Titre non généré"}</h2>
            <hr class="separator" />
            <strong>📝 Résumé :</strong><p class="editable-field" data-path="résumé">${quest.résumé || "Aucun résumé."}</p>
            <strong>🎯 Objectifs :</strong><ul>${objectifsHTML}</ul>
            <strong>🎭 PNJ Clés :</strong><ul>${pnjHTML}</ul>
            <strong>🔍 Rebondissement :</strong><p class="editable-field" data-path="twist">${quest.twist || "Aucun rebondissement."}</p>
            <strong>🗣️ Lignes de Dialogue Clés :</strong><ul>${dialogueHTML}</ul>
            <strong>🎁 Récompense :</strong><p class="editable-field" data-path="récompense">${quest.récompense || "Aucune récompense."}</p>
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

    // --- GESTION DE L'ÉDITION MANUELLE ---
    const handleEdit = (event) => {
        const field = event.target.closest('.editable-field');
        if (!field || document.querySelector('.is-editing')) return;

        field.classList.add('is-editing');
        field.setAttribute('contenteditable', 'true');
        field.focus();
        
        const range = document.createRange();
        const sel = window.getSelection();
        const { clientX, clientY } = event;
        if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(clientX, clientY);
            if(pos) range.setStart(pos.offsetNode, pos.offset);
        } else if (document.caretRangeFromPoint) {
            const pos = document.caretRangeFromPoint(clientX, clientY);
            if(pos) range.setStart(pos.startContainer, pos.startOffset);
        }
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);

        const onSave = () => {
            field.classList.remove('is-editing');
            field.removeAttribute('contenteditable');
            const questId = activeQuestId;
            const quest = quests.find(q => q.id === questId);
            const path = field.dataset.path;
            const newValue = field.textContent.replace(/"/g, '');
            if (quest && path) {
                setNestedValue(quest, path, newValue);
                saveQuests();
                if(path === 'titre') {
                    renderHistory();
                }
            }
            field.removeEventListener('blur', onSave);
            field.removeEventListener('keydown', onKeyDown);
        };

        const onKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                field.blur();
            } else if (e.key === 'Escape') {
                const quest = quests.find(q => q.id === activeQuestId);
                const pathParts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
                let originalValue = quest;
                for (const part of pathParts) {
                    originalValue = originalValue ? originalValue[part] : '';
                }
                field.textContent = originalValue || '';
                field.blur();
            }
        };

        field.addEventListener('blur', onSave);
        field.addEventListener('keydown', onKeyDown);
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
        const refinePrompt = `INSTRUCTION: Tu es un ${themeInfo.instruction}. Ta mission est de modifier la quête en JSON ci-dessous en suivant l'instruction de l'utilisateur. Tu dois respecter le thème et le formatage.
        
        QUÊTE ORIGINALE: ${JSON.stringify(quest, null, 2)}
        
        INSTRUCTION DE RAFFINEMENT: "${refinementInstruction}"
        
        RENVOIE UNIQUEMENT LA NOUVELLE VERSION COMPLÈTE DU JSON.`;
        
        try {
            const res = await fetch("http://localhost:1234/v1/chat/completions", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: "local-model", messages: [{ role: "user", content: refinePrompt }], temperature: 0.8, stream: false })
            });
            if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
            const data = await res.json();
            const rawReply = data.choices[0].message.content;
            const jsonString = extractJson(rawReply);
            const refinedQuestData = JSON.parse(jsonString);
            const questIndex = quests.findIndex(q => q.id === id);
            if (questIndex !== -1) {
                refinedQuestData.id = quest.id;
                refinedQuestData.theme = selectedTheme;
                quests[questIndex] = refinedQuestData;
                saveQuests();
                displayQuest(id);
            }
        } catch(err) { 
            alert(`Erreur lors du raffinage: ${err.message}`); 
        } finally {
            loadingDiv.classList.add("hidden");
            generateBtn.disabled = false;
        }
    };

    // --- FONCTION DE GÉNÉRATION ---
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

          Génère une quête détaillée en suivant ce modèle. TA RÉPONSE DOIT ÊTRE UNIQUEMENT UN BLOC DE CODE JSON VALIDE. N'utilise pas de formatage étrange, notamment des "/".
          
          Format JSON attendu (RÈGLE IMPORTANTE: les chaînes de caractères dans la liste "pnj" NE DOIVENT PAS contenir de tiret de liste):
          {
            "titre": "Titre de quête court et percutant, unique au concept.",
            "résumé": "Résumé narratif immersif de la quête, basé sur le concept.",
            "objectifs": ["Un objectif clair et mesurable, pertinent pour la quête."],
            "pnj": ["Nom du PNJ, rôle distinctif lié à la quête."],
            "dialogues": ["Ligne de dialogue clé, pertinente pour le récit ou un PNJ (si tu veux inclure le nom du PNJ, intègre-le dans cette même chaîne)."],
            "twist": "Rebondissement inattendu et pertinent pour la quête.",
            "récompense": "Récompense thématique et attrayante pour le joueur."
          }

          INSTRUCTIONS IMPORTANTES:
          - RÈGLE CRUCIALE: Pour les listes "objectifs", "pnj" et "dialogues", CHAQUE ÉLÉMENT DE LA LISTE DOIT ÊTRE une chaîne de caractères simple (string). NE GÉNÈRE JAMAIS d'objets JSON imbriqués ({}) ou d'autres structures complexes à l'intérieur de ces listes.
          - N'utilise PAS les exemples de noms génériques ou de descriptions du format.
          - Génère des NOMS et des RÔLES de PNJ entièrement NOUVEAUX et UNIQUES, adaptés au 'CONCEPT UTILISATEUR'.
          - Varie les rôles des PNJ pour éviter les répétitions.
          - Le nombre d'éléments dans les listes ("objectifs", "pnj", "dialogues") doit être VARIABLE et adapté à la complexité et à la richesse du 'CONCEPT UTILISATEUR'. Ne te limite pas à un seul élément si plusieurs sont nécessaires ou appropriés (généralement entre 1 et 4 éléments par liste, selon la pertinence).
          - Chaque champ JSON doit être rempli avec du contenu original, détaillé et directement inspiré du 'CONCEPT UTILISATEUR'.

          CONCEPT UTILISATEUR À RÉINTERPRÉTER: "${concept}"
        `;

        try {
            const res = await fetch("http://localhost:1234/v1/chat/completions", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: "local-model", messages: [{ role: "user", content: questPrompt }], temperature: 0.8, stream: false })
            });
            if (!res.ok) throw new Error(`Erreur du serveur: ${res.status}`);
            const data = await res.json();
            const rawReply = data.choices[0].message.content;
            const jsonString = extractJson(rawReply);
            const newQuest = JSON.parse(jsonString);
            
            if (!newQuest.titre) newQuest.titre = concept;
            newQuest.id = Date.now();
            newQuest.theme = selectedTheme;
            quests.unshift(newQuest);
            
            saveQuests();
            displayQuest(newQuest.id);
            inputElement.value = "";
        } catch (err) {
            alert(`Une erreur est survenue: ${err.message}`);
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
    questDisplayWrapper.addEventListener('click', handleEdit);
    cancelRefineBtn.addEventListener('click', closeRefineModal);
    confirmRefineBtn.addEventListener('click', executeRefinement);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeRefineModal();
    });
    themeSelector.addEventListener('change', updateThemeIcon);
    
    loadQuests();
    displayQuest(null);
});