# 📤 Dokumentation auf GitHub hochladen - Schritt für Schritt

## 🎯 Ziel
Ihre Dokumentation auf GitHub hochladen, damit die Mermaid-Diagramme automatisch als schöne Grafiken angezeigt werden.

---

## Schritt 1: GitHub Repository erstellen (falls noch nicht vorhanden)

1. Gehen Sie zu [github.com](https://github.com)
2. Klicken Sie auf **"+"** oben rechts → **"New repository"**
3. Geben Sie einen Namen ein: z.B. `salesflow-ai-docs` oder `salesflow-ai`
4. Wählen Sie **"Private"** (nur Sie sehen es) oder **"Public"** (jeder kann es sehen)
5. Klicken Sie auf **"Create repository"**

---

## Schritt 2: Lokales Git Repository initialisieren

### Option A: Wenn Sie Git noch nicht installiert haben

1. **Git installieren:**
   - Windows: [git-scm.com/download/win](https://git-scm.com/download/win)
   - Mac: `brew install git` (oder Download)
   - Linux: `sudo apt install git`

2. **Git konfigurieren:**
   ```bash
   git config --global user.name "Ihr Name"
   git config --global user.email "ihre-email@example.com"
   ```

### Option B: Git ist bereits installiert

Öffnen Sie PowerShell oder Terminal im Projekt-Verzeichnis:

```bash
# In das Projekt-Verzeichnis wechseln
cd C:\Users\Akquise WinStage\Desktop\SALESFLOW\salesflow-ai

# Git Repository initialisieren (falls noch nicht geschehen)
git init

# Alle Dateien hinzufügen
git add .

# Ersten Commit erstellen
git commit -m "Initial commit: Add documentation and project files"

# GitHub Repository als Remote hinzufügen
# Ersetzen Sie USERNAME und REPO-NAME mit Ihren Werten
git remote add origin https://github.com/IHR-USERNAME/IHR-REPO-NAME.git

# Dateien hochladen
git push -u origin main
```

---

## Schritt 3: GitHub Desktop verwenden (EINFACHER!)

Falls Sie Git-Befehle nicht mögen, nutzen Sie **GitHub Desktop**:

1. **GitHub Desktop installieren:**
   - [desktop.github.com](https://desktop.github.com)
   - Installieren und mit GitHub-Account anmelden

2. **Repository hinzufügen:**
   - Klicken Sie auf **"File"** → **"Add local repository"**
   - Wählen Sie Ihr Projekt-Verzeichnis: `C:\Users\Akquise WinStage\Desktop\SALESFLOW\salesflow-ai`
   - Klicken Sie auf **"Add repository"**

3. **Dateien hochladen:**
   - Unten links: Beschreibung eingeben: "Initial commit: Add documentation"
   - Klicken Sie auf **"Commit to main"**
   - Klicken Sie auf **"Publish repository"** (oben)
   - Wählen Sie **"Private"** oder **"Public"**
   - Klicken Sie auf **"Publish repository"**

**Fertig!** 🎉

---

## Schritt 4: Dokumentation ansehen

1. Gehen Sie zu Ihrem GitHub Repository
2. Navigieren Sie zu `docs/developer/architecture.md`
3. **Die Mermaid-Diagramme werden automatisch als Grafiken angezeigt!**

---

## Schritt 5: GitHub Pages (Optional - für öffentliche Website)

Wenn Sie die Dokumentation als Website anzeigen möchten:

1. Gehen Sie zu Ihrem Repository auf GitHub
2. Klicken Sie auf **"Settings"** (oben rechts)
3. Scrollen Sie zu **"Pages"** (links in der Sidebar)
4. Unter **"Source"** wählen Sie **"main"** Branch
5. Klicken Sie auf **"Save"**
6. Nach 1-2 Minuten ist Ihre Dokumentation unter verfügbar:
   - `https://IHR-USERNAME.github.io/IHR-REPO-NAME/docs/`

---

## 🎨 Mermaid-Diagramme in VS Code ansehen (Lokal)

Falls Sie die Diagramme lokal ansehen möchten, ohne GitHub:

1. **VS Code Extension installieren:**
   - Öffnen Sie VS Code
   - Gehen Sie zu Extensions (Strg+Shift+X)
   - Suchen Sie nach **"Markdown Preview Mermaid Support"**
   - Installieren Sie die Extension

2. **Dokumentation ansehen:**
   - Öffnen Sie eine `.md` Datei (z.B. `docs/developer/architecture.md`)
   - Drücken Sie **Strg+Shift+V** (Markdown Preview)
   - Die Diagramme werden als Grafiken angezeigt!

---

## 📋 Checkliste

- [ ] GitHub Account vorhanden
- [ ] Git installiert (oder GitHub Desktop)
- [ ] Repository auf GitHub erstellt
- [ ] Lokales Repository initialisiert
- [ ] Dateien committed
- [ ] Dateien zu GitHub gepusht
- [ ] Dokumentation auf GitHub angesehen
- [ ] (Optional) GitHub Pages aktiviert

---

## 🆘 Hilfe bei Problemen

### Problem: "git is not recognized"
**Lösung:** Git ist nicht installiert. Installieren Sie Git oder nutzen Sie GitHub Desktop.

### Problem: "Permission denied"
**Lösung:** Sie müssen sich bei GitHub authentifizieren. Nutzen Sie GitHub Desktop oder Personal Access Token.

### Problem: "Repository already exists"
**Lösung:** Das Repository existiert bereits. Nutzen Sie `git remote set-url origin https://github.com/USERNAME/REPO.git`

---

## 💡 Tipp

**GitHub Desktop ist die einfachste Methode!** Keine Befehle nötig, alles per Klick.

---

**Viel Erfolg! 🚀**

