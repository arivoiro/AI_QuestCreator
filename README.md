c# AI QuestCreator ⚔️

Un outil de prototypage rapide pour les narrative designers, utilisant un modèle de langage local pour générer des quêtes de jeu vidéo riches et thématiques.

## 🎥 Vidéo de Démonstration

[Vidéo de Démo](https://youtu.be/NW4dkyE-Nq4?si=QtaWCPjd0gv2OPul)

---

## ✨ Fonctionnalités Clés

- **Génération Thématique :** Créez des quêtes uniques en choisissant parmi plusieurs thèmes (Fantasy, Cyberpunk, Sci-Fi, Horreur Cosmique).
- **Prompt Engineering Avancé :** L'IA est guidée par des instructions complexes pour garantir des résultats cohérents et créatifs.
- **Raffinage Itératif :** Modifiez une quête existante avec de nouvelles instructions pour l'affiner.
- **Workflow Professionnel :** Historique des quêtes sauvegardé localement et fonction d'export en JSON pour une intégration facile dans un moteur de jeu.
- **100% Local et Privé :** L'application tourne entièrement en local via LM Studio, garantissant rapidité et confidentialité.

---

## 🛠️ Stack Technique

- **Front-end :** HTML5, CSS3, JavaScript (Vanilla)
- **Moteur IA :** N'importe quel modèle de langage local servi par [LM Studio](https://lmstudio.ai/).

---

## 🚀 Comment lancer le projet

1.  **Prérequis :** Avoir [LM Studio](https://lmstudio.ai/) installé.
2.  **Charger un Modèle :** Dans LM Studio, téléchargez et chargez **n'importe quel modèle "Instruct"** de votre choix (ex: Mistral, Llama, Phi-3, etc.). L'application est conçue pour être agnostique du modèle. Pour un compromis optimal entre vitesse d'exécution et performance, **qwen/qwen3-1.7b** est recommandé.
3.  **Lancer le Serveur :** Allez dans l'onglet "Developer" et démarrez le serveur en activant le bouton à côté de "Status: Stopped". Vous devriez maintenant avoir le bouton allumé en vert avec écrit "Status: Running".
4.  **Ouvrir l'Application :** Ouvrez simplement le fichier `index.html` dans votre navigateur.
