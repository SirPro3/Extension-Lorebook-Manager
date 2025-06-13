import { t } from '../../../i18n.js';

const path = 'third-party/Extension-LorebookManager';

let isUpdating = false;
let originalOrder = [];

/**
 * Updates the lorebook manager button's icon.
 * @param {HTMLElement} button The lorebook manager button element.
 */
function updateLorebookManagerButtonIcon(button) {
    const icon = button.querySelector('i');
    icon.className = 'fa-solid fa-gear';
    button.title = t`Lorebook Manager`;
}

/**
 * Reorders the lorebook dropdown based on custom sections.
 * @param {HTMLSelectElement} lorebookDropdown
 */
function updateLorebookOrder(lorebookDropdown) {
    const selectedValue = lorebookDropdown.value;
    const sections = JSON.parse(localStorage.getItem('lorebookSections')) || [];
    const allOptions = Array.from(lorebookDropdown.options);

    if (originalOrder.length === 0) {
        originalOrder = allOptions.map(opt => opt.text);
    }

    lorebookDropdown.innerHTML = '';

    const allManagedLorebooks = sections.flatMap(s => s.lorebooks);
    const unmanagedOptions = allOptions.filter(opt => !allManagedLorebooks.includes(opt.text));

    for (const sectionData of sections) {
        const group = document.createElement('optgroup');
        group.label = sectionData.title;
        for (const lorebookName of sectionData.lorebooks) {
            const option = allOptions.find(o => o.text === lorebookName);
            if (option) {
                group.appendChild(option);
            }
        }
        if (group.children.length > 0) {
            lorebookDropdown.appendChild(group);
        }
    }

    const otherGroup = document.createElement('optgroup');
    otherGroup.label = 'Other';
    unmanagedOptions.sort((a, b) => originalOrder.indexOf(a.text) - originalOrder.indexOf(b.text));
    for (const option of unmanagedOptions) {
        otherGroup.appendChild(option);
    }

    if (otherGroup.children.length > 0) {
        lorebookDropdown.appendChild(otherGroup);
    }


    if (Array.from(lorebookDropdown.options).some(option => option.value === selectedValue)) {
        lorebookDropdown.value = selectedValue;
    }
}

/**
 * Injects the extension's stylesheet into the document head.
 */
function loadStylesheet() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `extensions/${path}/style.css`;
    document.head.appendChild(link);
}

/**
 * Creates and adds the lorebook manager button to the UI.
 */
function addLorebookManagerButton() {
    if (document.getElementById('lorebook_manager_button')) {
        return; // Button already exists
    }

    const lorebookDropdown = /** @type {HTMLSelectElement} */ (document.getElementById('world_editor_select'));
    const renameWorldInfoButton = document.getElementById('world_popup_name_button');

    if (!renameWorldInfoButton || !lorebookDropdown) {
        console.error('Lorebook Manager Extension: Could not find lorebook controls (rename button or lorebook dropdown).');
        return;
    }

    const lorebookManagerButton = document.createElement('div');
    lorebookManagerButton.id = 'lorebook_manager_button';
    lorebookManagerButton.classList.add('menu_button', 'menu_button_icon');
    
    const icon = document.createElement('i');
    lorebookManagerButton.appendChild(icon);

    renameWorldInfoButton.insertAdjacentElement('afterend', lorebookManagerButton);

    lorebookManagerButton.addEventListener('click', () => {
        createLorebookManagerPopup();
    });


    // Set the initial state of the button and dropdown order when the script loads
    updateLorebookManagerButtonIcon(lorebookManagerButton);
    updateLorebookOrder(/** @type {HTMLSelectElement} */ (lorebookDropdown));
}

function createLorebookManagerPopup() {
    const popup = document.createElement('div');
    popup.id = 'lorebook_manager_popup';
    popup.innerHTML = `
        <div class="lorebook-manager-popup-content">
            <span class="close-lorebook-manager-popup">&times;</span>
            <h2>Lorebook Manager</h2>
            <div class="lorebook-manager-controls">
                <input type="text" id="new_section_title" placeholder="New section title">
                <button id="add_section_button">Add Section</button>
            </div>
            <div id="lorebook_sections_container"></div>
        </div>
    `;
    document.body.appendChild(popup);

    const closeButton = popup.querySelector('.close-lorebook-manager-popup');
    closeButton.addEventListener('click', () => {
        popup.remove();
    });

    const addSectionButton = popup.querySelector('#add_section_button');
    const newSectionTitleInput = /** @type {HTMLInputElement} */ (popup.querySelector('#new_section_title'));
    const sectionsContainer = popup.querySelector('#lorebook_sections_container');

    addSectionButton.addEventListener('click', () => {
        const title = newSectionTitleInput.value.trim();
        if (title) {
            const section = createSectionElement(title);
            sectionsContainer.appendChild(section);
            newSectionTitleInput.value = '';
            saveSections();
        }
    });

    function createLorebookItem(lorebookName) {
        const lorebookItem = document.createElement('div');
        lorebookItem.className = 'lorebook-item';
        lorebookItem.textContent = lorebookName;
        lorebookItem.dataset.lorebookName = lorebookName; // for easier selection

        const deleteButton = document.createElement('span');
        deleteButton.className = 'delete-lorebook-item';
        deleteButton.innerHTML = '&times;';
        deleteButton.addEventListener('click', () => {
            lorebookItem.remove();
            saveSections();
            updateLorebookOrder(/** @type {HTMLSelectElement} */ (document.getElementById('world_editor_select')));
        });

        lorebookItem.appendChild(deleteButton);
        return lorebookItem;
    }

    function createSectionElement(title, lorebooks = []) {
        const section = document.createElement('div');
        section.className = 'lorebook-section';
        section.innerHTML = `
            <h3 class="lorebook-section-title">${title}</h3>
            <div class="lorebook-list"></div>
            <div class="add-lorebook-flyout-anchor">
                <button class="add-lorebook-button">+</button>
            </div>
        `;

        const titleElement = section.querySelector('h3');
        const deleteButton = document.createElement('span');
        deleteButton.className = 'delete-section';
        deleteButton.innerHTML = '&times;';
        deleteButton.title = 'Delete section';
        deleteButton.addEventListener('click', () => {
            section.remove();
            saveSections();
            updateLorebookOrder(/** @type {HTMLSelectElement} */ (document.getElementById('world_editor_select')));
        });
        titleElement.appendChild(deleteButton);

        const lorebookList = section.querySelector('.lorebook-list');
        const addLorebookButton = section.querySelector('.add-lorebook-button');

        addLorebookButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const flyout = createAddLorebookFlyout(section);
            const anchor = section.querySelector('.add-lorebook-flyout-anchor');
            anchor.appendChild(flyout);
        });

        for (const lorebookName of lorebooks) {
            const lorebookItem = createLorebookItem(lorebookName);
            lorebookList.appendChild(lorebookItem);
        }
        return section;
    }

    function saveSections() {
        const sections = [];
        sectionsContainer.querySelectorAll('.lorebook-section').forEach(sectionEl => {
            const title = sectionEl.querySelector('h3').firstChild.textContent.trim();
            const lorebooks = [];
            sectionEl.querySelectorAll('.lorebook-item').forEach(lorebookEl => {
                lorebooks.push((/** @type {HTMLElement} */ (lorebookEl)).dataset.lorebookName);
            });
            sections.push({ title, lorebooks });
        });
        localStorage.setItem('lorebookSections', JSON.stringify(sections));
    }

    function loadSections() {
        const sections = JSON.parse(localStorage.getItem('lorebookSections')) || [];
        for (const sectionData of sections) {
            const section = createSectionElement(sectionData.title, sectionData.lorebooks);
            sectionsContainer.appendChild(section);
        }
    }

    function createAddLorebookFlyout(section) {
        const flyout = document.createElement('div');
        flyout.className = 'add-lorebook-flyout';

        const lorebookDropdown = /** @type {HTMLSelectElement} */ (document.getElementById('world_editor_select'));
        const allLorebooks = Array.from(lorebookDropdown.options).map(opt => opt.text).filter(Boolean);
        const currentLorebooks = Array.from(section.querySelectorAll('.lorebook-item')).map(item => (/** @type {HTMLElement} */ (item)).dataset.lorebookName);
        const availableLorebooks = allLorebooks.filter(p => !currentLorebooks.includes(p));

        for (const lorebookName of availableLorebooks) {
            const flyoutItem = document.createElement('div');
            flyoutItem.className = 'flyout-item';
            flyoutItem.textContent = lorebookName;
            flyoutItem.addEventListener('click', () => {
                const lorebookItem = createLorebookItem(lorebookName);
                section.querySelector('.lorebook-list').appendChild(lorebookItem);
                saveSections();
                updateLorebookOrder(lorebookDropdown);
                flyout.remove();
            });
            flyout.appendChild(flyoutItem);
        }

        document.addEventListener('click', (event) => {
            if (!flyout.contains(/** @type {Node} */ (event.target))) {
                flyout.remove();
            }
        }, { once: true });

        return flyout;
    }

    loadSections();
}

(function init() {
    // Extensions are typically loaded after the main UI is ready.
    setTimeout(() => {
        loadStylesheet();
        addLorebookManagerButton();
    }, 1000);
})();