# CineKeep 🍿📺

A vibrant, responsive, and premium Chrome Extension built with Manifest V3 to catalog, rate, and manage your favorite movies and TV shows. CineKeep features a sleek dark-mode glassmorphic interface with neon gradient borders and smooth micro-animations.

---

## ✨ Features

- **Premium UI/UX:** Clean, modern dark mode using glassmorphic card designs, custom scrollbars, and vibrant neon gradients (Pink/Purple for Movies, Cyan/Blue for TV Shows).
- **Interactive Rating System:** Dynamic 5-star rating picker with custom textual feedback (e.g. *Masterpiece! 🏆*, *Good choice 👍*).
- **Live Search & Filter:** Instant search capability across titles, reviews, and genres. Filter by category (Movies, TV Shows, or All) with active chips.
- **Smart Sorting:** Sort your watchlist by Date Added, Star Rating (highest/lowest), or Title (Alphabetical A-Z/Z-A).
- **Live Cover Art Previews:** Add a custom poster image URL to render rich visual cards, or enjoy a dynamic gradient fallback featuring the movie's initials.
- **Insightful Analytics:** Live computation of your total watchlist count, average rating across all items, type split, and top 4 genres.
- **Backup & Restore:** Easily export your library to a `.json` backup file or restore it anytime. Wiping data is safeguarded with double-confirmation alerts.
- **Zero-Dependency & Offline First:** Works 100% offline, load times are instantaneous, and it falls back safely to browser LocalStorage when debugging outside an extension context.

---

## 🛠️ Installation

Follow these simple steps to install CineKeep in your Google Chrome browser:

1. **Clone or Download** this repository to your local machine:
   ```bash
   git clone https://github.com/harinarayana1457-cmyk/Cine-keep.git
   ```
2. Open **Google Chrome** and navigate to the extensions page by typing:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. In the file explorer, select the folder where this project is located (the folder containing `manifest.json`).
6. Click the Extensions (puzzle) icon in your Chrome toolbar, find **CineKeep**, and click the **Pin** icon to keep it accessible!

---

## 📸 How to Use

### Adding an Item
1. Open the popup and navigate to the **Add New** tab.
2. Enter the Title (required) and select whether it is a **Movie** or **TV Show**.
3. Input optional genres (separated by commas) and write your review notes.
4. Click stars to rate it out of 5.
5. Paste a poster image URL to see a live preview in the preview box.
6. Click **Save to Library** to save.

### Managing Your Library
- Use the **Search Bar** or **Filter Chips** to find specific titles.
- Hover over any card in the **Library** tab to reveal the edit (pencil) and delete (trash) action icons.
- Click **Edit** to preload the item details into the input form.
- Click **Delete** to remove an item. An **Undo** toast will appear at the bottom for 4 seconds if you change your mind!

### Statistics & Backup
- Access the **Stats** tab to see your profile metrics and favorite genres.
- Use **Export JSON** to save your database locally.
- Use **Import JSON** to restore your database from a backup file.

---

## ⚙️ Technologies Used

- **Manifest V3:** Modern Chrome Extension standard for security and performance.
- **HTML5:** Semantic architecture.
- **CSS3 (Vanilla):** Custom CSS properties, grid/flex layouts, backdrop-filters, and custom animations.
- **JavaScript (ES6):** State Management, Chrome Storage API, File Readers for JSON importing, and live event listeners.