# Study Progress Tracker

一個用 React + Firebase Cloud Firestore 實作的學習進度追蹤系統，可以讓使用者輸入暱稱，並記錄各科影片觀看進度。前端與後端分離，支援本地開發與自動化部署到 Firebase Hosting。

---

## 專案結構

study-progress-tracker/
├── public/
│ └── index.html
├── src/
│ ├── App.jsx
│ ├── firebaseConfig.js
│ ├── index.js
│ ├── index.css
│ └── …
├── .firebaserc
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── package.json
└── README.md


---

## 環境需求

- Node.js ≥ v16  
- npm ≥ 8.x  
- Firebase CLI (`npm install -g firebase-tools`)  
- Git & GitHub 帳號

---

## 本地開發

1. **複製專案**  
   ```bash
   git clone git@github.com:<你的帳號>/study-progress-tracker.git
   cd study-progress-tracker


2. 安裝相依套件
    npm install

3. 設定 Firebase
    打開 src/firebaseConfig.js，填入你的專案參數：

    ```bash
    export const firebaseConfig = {
        apiKey: "AIza…",
        authDomain: "study-progress-tracker-5f263.firebaseapp.com",
        projectId: "study-progress-tracker-5f263",
        storageBucket: "…",
        messagingSenderId: "…",
        appId: "…",
    };

    注意：projectId、apiKey 必須與 Firebase Console → 專案設定 完全一致。

4. 啟動開發伺服器

    ```bash
    npm start

    打開瀏覽器 → http://localhost:3000，修改程式後會自動熱重載。

## Firebase 設定

1. 建立 Web 應用程式

    1. Firebase Console → 專案 → ⚙️ 專案設定 → 一般設定

    2. 在「你的應用程式」區塊，點 新增應用程式 → 選 </> → 填暱稱 → 建立

    3. 拷貝 SDK 配置到 src/firebaseConfig.js。

2. 啟用 Cloud Firestore

    1. Console 左側 → Build → Firestore Database

    2. 如果跳出「建立資料庫」精靈，選 Native 模式、地區建議選「asia-east1」，按 啟用。

    3. 在 規則 (Rules) 分頁，臨時改成：

        ```bash
        rules_version = '2';
        service cloud.firestore {
            match /databases/{database}/documents {
                match /{document=**} {
                    allow read, write: if true;
                }
            }
        }
        ```

        方便開發，之後再調整為正式規則。

3. 安全規則（部署前務必改回）
    ```bash
    rules_version = '2';
    service cloud.firestore {
        match /databases/{database}/documents {
            match /students/{studentId} {
            // 只允許登入後且 UID = studentId 的文件存取
            allow read, write: if request.auth != null
                && request.auth.token.nickname == studentId;
            }
        }
    }
4. 索引設定
    如果你用到複雜查詢，編輯 firestore.indexes.json，確保移除所有 // 註解，只保留：

    ```bash
    {
        "indexes": [],
        "fieldOverrides": []
    }
## 📑 GitHub & CI/CD
1. 推上 GitHub
    ```bash

        git init
        git add .
        git commit -m "feat: initial commit"
        git branch -M main
        git remote add origin git@github.com:<你的帳號>/study-progress-tracker.git
        git push -u origin main
    ```

2. 安裝並登入 Firebase CLI
    ```bash

    npm install -g firebase-tools
    firebase login
3. 生成 CI Token
    ```bash
    firebase login:ci
    ```
    成功後終端機會印出一串以 1//04… 開頭的 Token，複製整段。

4. 設定 GitHub Secrets

    在你的 GitHub Repo → Settings → 左側 Secrets and variables → Actions → New repository secret

    Name：FIREBASE_TOKEN

    Value：步驟 3 複製的那串 Token

5. 初始化 Firebase Hosting & Firestore
    ```bash
    firebase init
    ```
    ## 選擇功能：

    Firestore: Configure rules & indexes

    Hosting: Configure files & (optionally) GitHub Action

    選擇專案：study-progress-tracker-5f263

    Hosting public 資料夾：build

    Single-page app? → Yes

    是否要設置 GitHub Action → Yes（讓 CLI 幫你產生 .github/workflows/firebase-hosting-merge.yml）
    ##

6. 自動部署流程

    每次 PR 合併到 main 或直接 push main，GitHub Action 就會執行：

        npm ci
        npm run build
        firebase deploy --only hosting,firestore:rules,firestore:indexes --token ${{ secrets.FIREBASE_TOKEN }}
    
    手動重跑：Actions → 選工作流程 → 最新 Run → Re-run jobs

## 🛠 本地手動部署

    npm run build
    firebase deploy --only hosting,firestore:rules,firestore:indexes
## ❓ 常見問題
- 404 on refresh

        Hosting → Rewrite all URLs to /index.html → Yes

- PERMISSION_DENIED

    臨時放寬 Rules → 若能寫入，表示規則有誤→調整回正式規則

- 資料讀不到 / crash

    確保 fetchStudents 補齊 progress 欄位

    Optional chaining (student.progress?.[id] ?? 0)

- 索引報錯

    刪除 firestore.indexes.json 內所有註解

    保留空陣列即可

