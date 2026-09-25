/**
 * 魔法糖果工坊 - 具象化教具模組 (CandyStore)
 * 將「千、百、十、個」轉化為生動的糖果包裝，直觀展示拆解與借位過程
 */

class CandyStore {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.columns = [
            { key: 'ones', name: '個位', unit: 1, icon: '🍬', boxName: '星星糖', color: '#ff7597' },
            { key: 'tens', name: '十位', unit: 10, icon: '🏺', boxName: '糖果罐', color: '#ffb037' },
            { key: 'hundreds', name: '百位', unit: 100, icon: '🛍️', boxName: '分享包', color: '#3ec5a0' },
            { key: 'thousands', name: '千位', unit: 1000, icon: '📦', boxName: '大貨箱', color: '#597ef7' }
        ]; // index 0 is ones, 3 is thousands
    }

    render(digits, activeColIndex = null, highlightBorrow = null) {
        if (!this.container) return;
        this.container.innerHTML = '';

        // 從千位排到個位 (由左至右: 3, 2, 1, 0)
        for (let i = 3; i >= 0; i--) {
            const col = this.columns[i];
            const count = digits[i] !== undefined ? digits[i] : 0;
            const isActive = activeColIndex === i;
            const isBorrowSource = highlightBorrow && highlightBorrow.from === i;
            const isBorrowTarget = highlightBorrow && highlightBorrow.to === i;

            const colCard = document.createElement('div');
            colCard.className = `candy-column-card ${isActive ? 'active-col' : ''} ${isBorrowSource ? 'borrow-source' : ''} ${isBorrowTarget ? 'borrow-target' : ''}`;
            colCard.dataset.colIndex = i;

            // 標頭資訊
            const header = document.createElement('div');
            header.className = 'column-header';
            header.innerHTML = `
                <span class="col-title" style="background:${col.color}">${col.name} (${col.unit})</span>
                <span class="col-unit-name">${col.boxName}</span>
            `;

            // 數量徽章
            const countBadge = document.createElement('div');
            countBadge.className = 'candy-count-badge';
            countBadge.innerHTML = `現有：<span class="count-num">${count}</span> 個`;

            // 實物展示區（展示糖果小圖標，根據數量智慧調整欄位與大小）
            const itemsDisplay = document.createElement('div');
            let densityClass = 'density-sparse';
            if (count >= 10) {
                densityClass = 'density-dense'; // 10~19個：5列排列，5個一排一目了然
            } else if (count >= 5) {
                densityClass = 'density-medium'; // 5~9個：4列排列
            }
            itemsDisplay.className = `candy-items-grid ${densityClass}`;

            // 繪製糖果實物（如果數量很多，例如退位後有 10~19 個，精美排列並分組展示）
            if (count === 0) {
                itemsDisplay.innerHTML = `<div class="empty-hint">（空的 0 個）</div>`;
            } else {
                const maxIcons = Math.min(count, 19);
                for (let k = 0; k < maxIcons; k++) {
                    const item = document.createElement('span');
                    item.className = 'candy-single-item pop-in';
                    item.title = `${col.boxName}`;
                    item.textContent = col.icon;
                    // 若是借來的新增部分（例如超過原本的），可以用微光標記
                    if (k >= count - 10 && count > 9 && isBorrowTarget) {
                        item.classList.add('new-candy');
                    }
                    itemsDisplay.appendChild(item);
                }
            }

            // 底部說明小標籤
            const footerHint = document.createElement('div');
            footerHint.className = 'column-footer-hint';
            if (i > 0) {
                const lowerCol = this.columns[i - 1];
                footerHint.textContent = `1 ${col.boxName} = 10 ${lowerCol.boxName}`;
            } else {
                footerHint.textContent = `最基礎的單顆糖果`;
            }

            colCard.appendChild(header);
            colCard.appendChild(countBadge);
            colCard.appendChild(itemsDisplay);
            colCard.appendChild(footerHint);

            this.container.appendChild(colCard);
        }
    }

    // 播放拆裝動態（借 1 當 10 的粒子飛散動畫）
    animateBorrow(fromIndex, toIndex, callback) {
        window.soundEngine.playBorrow();

        // 取得來源卡片與目標卡片的位置
        const fromCard = this.container.querySelector(`.candy-column-card[data-col-index="${fromIndex}"]`);
        const toCard = this.container.querySelector(`.candy-column-card[data-col-index="${toIndex}"]`);

        if (!fromCard || !toCard) {
            if (callback) callback();
            return;
        }

        fromCard.classList.add('shake-source');
        
        // 建立一顆漂浮的拆解大糖果包
        const rectFrom = fromCard.getBoundingClientRect();
        const rectTo = toCard.getBoundingClientRect();

        const flyer = document.createElement('div');
        flyer.className = 'flying-candy-box';
        flyer.textContent = this.columns[fromIndex].icon;
        flyer.style.left = `${rectFrom.left + rectFrom.width / 2 - 25}px`;
        flyer.style.top = `${rectFrom.top + rectFrom.height / 2 - 25}px`;
        document.body.appendChild(flyer);

        // 飛行與炸裂為 10 個的過渡
        setTimeout(() => {
            flyer.style.left = `${rectTo.left + rectTo.width / 2 - 25}px`;
            flyer.style.top = `${rectTo.top + rectTo.height / 2 - 25}px`;
            flyer.style.transform = 'scale(1.4) rotate(360deg)';
        }, 50);

        setTimeout(() => {
            if (flyer.parentNode) flyer.parentNode.removeChild(flyer);
            toCard.classList.add('burst-receive');
            setTimeout(() => {
                fromCard.classList.remove('shake-source');
                toCard.classList.remove('burst-receive');
                if (callback) callback();
            }, 400);
        }, 650);
    }
}

window.CandyStore = CandyStore;
