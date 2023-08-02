
class GUSIDataTable {
    selector;
    settings;
    data = [];
    sortedData = [];
    searchResults = [];
    mainCheckbox;
    selectedElements = [];
    element;
    thead;
    tbody;
    clickCounts;

    sortColumnIndex = 0;

    pagination = {
        currentPage: 1,      // Página actual
        recordsPerPage: 5,  // Registros por página
    };

    debounceTimer = null

    paginationSelector;
    paginationElement;

    searchTerm = "";

    constructor(selector,
        settings = {
            class: null,
            renderFromSelector: false,
            headers: [],

            actionButtonsContainerClass: "gusi-table_actionbuttons_container",
            actionButtons: [],

            allowSelect: false,
            customSelectHTML,
            customSelectActionableSelector,

            allowSearch: false,
            customSearchContainerClass: 'datatable_search_container',
            customSearchLabelClass: null,
            customSearchInputClass: null,

            showLabels: true,

            showPagination: true,
            paginationContainerClass,
            paginationButtonClass,
            paginationPrevNextButtonClass,
            recordsToShow: [5, 10, 15],
            paginationButtonsPerSide: 3,
            paginationSelectorContainerClass,
            paginationSelectorClass,

            sortable: false,

            serverSide: false,
            serverSideSort: false,
            serverSideSearch: true,
            serverURL: null,
            serverSettings: {},
            strings: {}
        },
        data = []) {
        this.selector = selector;
        this.settings = settings;
        if (data) {
            this.data = data;
            this.sortedData = data;
        }
        this.element = document.createElement('div');
        this.element.className = "gusi-datatable";
        if (!this.settings.strings) {
            this.settings.strings = {
                no_records: "No records to show",
                search: "Search",
                search_not_matches: "No matches found",
                pagination_showing: "Showing ",
                pagination_of: " of ",
                pagination_records: " records",
                pagination_previus: "Previus",
                pagination_next: "Next",
                pagination_show: "Show ",
                selection_records_selected: " records selected",
                fetching_data: "Fetching data..."
            }
        }
        if (this.settings.serverSide && !this.settings.serverSettings) {
            this.settings.serverSettings = {
                method: "GET",
                requestParamPage: "page",
                requestParamRecordsPerPage: "records",
                requestParamSearch: "search",
                requestData: []
            }
        }
        if (!this.settings.paginationButtonsPerSide && this.settings.showPagination) {
            this.settings.paginationButtonsPerSide = 3;
        }
        if (this.settings.showPagination) {
            if (!this.settings.recordsToShow) {
                this.settings.recordsToShow = [5, 10, 15, 25, 50, 100];
            }
            this.pagination.recordsPerPage = this.settings.recordsToShow[0];
        }
        this.render();
    }

    render() {
        this.renderActionButtons();
        this.renderSearch();
        this.fetchData();
        if (!this.settings.renderFromSelector) {
            this.renderHeaders();
            this.renderBody();
            let table = document.createElement('table');
            if (this.thead) {
                table.appendChild(this.thead);
            }
            if (this.tbody) {
                table.appendChild(this.tbody);
            }
            if (this.settings.class) {
                table.className = this.settings.class;
            }
            this.element.appendChild(table);
        } else {
            this.parse();
        }
        this.renderPagination();
        this.update();
        let destElement = document.querySelector(this.selector);
        destElement.parentNode.replaceChild(this.element, destElement);
    }

    parse() { }

    renderActionButtons() {
        if (!this.settings.actionButtons) {
            return null;
        }
        if (this.settings.actionButtons.length > 0) {
            const actionButtonsContainer = document.createElement('div');
            if (this.settings.actionButtonsContainerClass) {
                actionButtonsContainer.className = this.settings.actionButtonsContainerClass;
            }
            this.settings.actionButtons.forEach(button => {
                const actionButton = this.createActionButton(button);
                actionButtonsContainer.appendChild(actionButton);
            });
            this.element.append(actionButtonsContainer);
        }
    }
    createActionButton(button) {
        const actionButton = document.createElement('button');
        if (button.class) {
            actionButton.className = button.class;
        }
        if (button.content) {
            actionButton.innerHTML = button.content;
        } else {
            actionButton.append("Action");
        }
        if (button.attributes) {
            button.attributes.forEach(attribute => {
                actionButton.setAttribute(attribute.name, attribute.value);
            });
        }
        if (button.callback) {
            actionButton.addEventListener(button.callback.event, button.callback.function)
        }
        return actionButton;
    }

    renderSearch() {
        if (this.settings.allowSearch) {
            let searchContainer = document.createElement('div');
            if (this.settings.customSearchContainerClass) {
                searchContainer.className = this.settings.customSearchContainerClass;
            }
            let labelElement = document.createElement('label');
            let inputSearch = document.createElement('input');
            let inputID = "gusidtbl_input_" + Date.now() + Math.round(Math.random() * 10000 + 1);
            inputSearch.type = "search";
            inputSearch.id = inputID;
            if (this.settings.customSearchInputClass) {
                inputSearch.className = this.settings.customSearchInputClass;
            }
            labelElement.htmlFor = inputID;
            labelElement.innerHTML = this.settings.strings.search;
            if (this.settings.customSearchLabelClass) {
                labelElement.className = this.settings.customSearchLabelClass;
            }
            searchContainer.appendChild(labelElement);
            searchContainer.appendChild(inputSearch);

            // Implementar el "debounce" para la búsqueda
            inputSearch.addEventListener('input', () => {
                clearTimeout(this.debounceTimer); // Limpiar el temporizador anterior
                const searchTerm = inputSearch.value;
                this.debounceTimer = setTimeout(() => {
                    this.searchTerm = searchTerm;
                    this.filterRowsBySearchTerm();
                }, 500); // Establecer un tiempo de espera antes de ejecutar la búsqueda
            });

            this.element.appendChild(searchContainer);
        }
    }

    // Nueva función para agregar clases de ordenamiento a las columnas
    addSortClassesToHeaders() {
        // Remover todas las clases de ordenamiento de las th
        this.thead.querySelectorAll('th').forEach(th => {
            th.classList.remove('gusitable-order-asc', 'gusitable-order-desc', 'gusitable-order-default');
        });

        // Agregar la clase de ordenamiento correspondiente a la th clickeada
        const sortDirection = this.settings.headers[this.sortColumnIndex].sortDirection;
        const th = this.thead.querySelector(`th:nth-child(${this.sortColumnIndex + 1 + (this.settings.allowSelect ? 1 : 0)})`);
        if (sortDirection === 'asc') {
            th.classList.add('gusitable-order-asc');
        } else if (sortDirection === 'desc') {
            th.classList.add('gusitable-order-desc');
        } else {
            th.classList.add('gusitable-order-default');
        }
    }

    // Método renderHeaders() con la nueva función addSortClassesToHeaders()
    renderHeaders() {
        if (!this.settings.headers) {
            return null;
        }
        this.clickCounts = this.settings.headers.map(() => 0);

        if (this.settings.headers.length > 0) {
            let thead = document.createElement('thead');
            let tr = document.createElement('tr');

            if (this.settings.allowSelect) {
                let thSelect = document.createElement('th');
                if (this.settings.customSelectHTML) {
                    thSelect.innerHTML = this.settings.customSelectHTML;
                } else {
                    let check = document.createElement('input');
                    check.type = "checkbox";
                    thSelect.appendChild(check);
                }
                let checkSelector = 'input';
                if (this.settings.customSelectActionableSelector) {
                    checkSelector = this.settings.customSelectActionableSelector;
                }
                let mainCheckbox = thSelect.querySelector(checkSelector);
                mainCheckbox.addEventListener('change', () => {
                    if (mainCheckbox.checked || mainCheckbox.indeterminate) {
                        this.selectAllRows();
                    } else {
                        this.unselectAllRows();
                    }
                });
                if (thSelect.childElementCount == 1) {
                    thSelect.style.width = 0;
                }
                this.mainCheckbox = mainCheckbox;
                tr.appendChild(thSelect);
            }

            this.settings.headers.forEach((thItem, columnIndex) => {
                let th = document.createElement('th');
                if (thItem.attributes) {
                    thItem.attributes.forEach(attribute => {
                        th.setAttribute(attribute.name, attribute.value);
                    });
                }

                // Agregar evento clic para ordenar las filas
                if (this.settings.sortable) {
                    th.addEventListener('click', () => {
                        this.sortColumnIndex = columnIndex;
                        this.sortRowsByColumn();
                        this.addSortClassesToHeaders();
                    });
                }

                th.textContent = thItem.label;
                tr.appendChild(th);
            });

            thead.appendChild(tr);
            this.thead = thead;
        }
    }

    renderBody() {
        const tbody = document.createElement('tbody');
        this.tbody = tbody;
    }
    update(reFetch = false) {
        // Eliminar filas actuales del tbody
        this.removeChildNodes(this.tbody);

        if (!this.settings.headers) {
            return;
        }

        if (this.sortedData.length === 0 && !this.settings.serverSide) {
            this.pushTableRowMsg(this.settings.strings.no_records);
            return;
        }

        if (this.settings.serverSide && reFetch) {
            this.fetchData();
        }

        if (this.getTotalPages() < this.pagination.currentPage) {
            this.pagination.currentPage = 1;
        }

        const { currentPage, recordsPerPage } = this.pagination;
        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const recordsToShow = this.settings.showPagination ? this.sortedData.slice(startIndex, endIndex) : this.sortedData;
        console.log(this.pagination, "Total Pages:" + this.getTotalPages());

        recordsToShow.forEach(item => {
            const tr = document.createElement('tr');

            if (this.settings.allowSelect) {
                const firstTd = document.createElement('td');

                if (this.settings.customSelectHTML) {
                    firstTd.innerHTML = this.settings.customSelectHTML;
                } else {
                    const check = document.createElement('input');
                    check.type = "checkbox";
                    firstTd.appendChild(check);
                }

                // Evento para seleccionar o deseleccionar elementos
                const mainCheckbox = firstTd.querySelector(
                    this.settings.customSelectActionableSelector || 'input[type="checkbox"]'
                );

                if (this.selectedElements.includes(item)) {
                    mainCheckbox.checked = true;
                }

                mainCheckbox.addEventListener('change', () => {
                    if (mainCheckbox.checked) {
                        // Si se selecciona el checkbox, se agrega el elemento al array selectedElements
                        this.selectedElements.push(item);
                    } else {
                        // Si se deselecciona el checkbox, se elimina el elemento del array selectedElements
                        const index = this.selectedElements.indexOf(item);
                        if (index !== -1) {
                            this.selectedElements.splice(index, 1);
                        }
                        let checkSelector = 'input';
                        if (this.settings.customSelectActionableSelector) {
                            checkSelector = this.settings.customSelectActionableSelector;
                        }
                        this.thead.querySelector(checkSelector).checked = false;
                    }
                    console.log(this.selectedElements);
                });

                tr.appendChild(firstTd);
            }

            this.settings.headers.forEach(header => {
                const td = document.createElement('td');

                if (header.alias) {
                    if (header.append && typeof header.append === 'function') {
                        const customContent = header.append(item[header.alias], item);
                        td.innerHTML = customContent; // Agregar contenido retornado al <td>
                    } else {
                        const value = item[header.alias];
                        td.textContent = value !== undefined ? value : '';
                    }
                }

                tr.appendChild(td);
            });

            this.tbody.appendChild(tr);
        });

        if (recordsToShow.length == 0 && this.settings.allowSearch && this.searchTerm.length > 0) {
            this.pushTableRowMsg(this.settings.strings.search_not_matches);
        }
        this.updatePagination();
    }

    renderPagination() {
        let pagination = document.createElement('div');
        if (this.settings.paginationContainerClass) {
            pagination.className = this.settings.paginationContainerClass;
        }
        let paginationSelect = document.createElement('div');
        if (this.settings.paginationSelectorContainerClass) {
            paginationSelect.className = this.settings.paginationSelectorContainerClass;
        }
        let textShow = document.createElement('span');
        textShow.textContent = this.settings.strings.pagination_show;
        paginationSelect.appendChild(textShow);
        let selector = document.createElement('select');
        this.settings.recordsToShow.forEach(quantity => {
            let option = document.createElement('option');
            option.value = quantity;
            option.text = quantity;
            selector.appendChild(option);
        });
        if (this.settings.paginationSelectorClass) {
            selector.className = this.settings.paginationSelectorClass;
        }
        selector.addEventListener('change', () => {
            this.pagination.recordsPerPage = Number.parseInt(selector.value);
            this.update();
        });
        paginationSelect.appendChild(selector);
        let textRecords = document.createElement('span');
        textRecords.textContent = this.settings.strings.pagination_records;
        paginationSelect.appendChild(textRecords);

        this.paginationElement = pagination;
        this.paginationSelector = paginationSelect;
        this.element.appendChild(this.paginationSelector);
        this.element.appendChild(this.paginationElement);
    }
    updatePagination() {
        // Limpia los botones anteriores
        this.removeChildNodes(this.paginationElement);

        // Botón "Anterior"
        const prevButton = document.createElement('button');
        prevButton.textContent = this.settings.strings.pagination_previus;
        prevButton.disabled = this.pagination.currentPage === 1;
        prevButton.addEventListener('click', () => {
            this.pagination.currentPage = this.pagination.currentPage - 1;
            this.update();
        });
        if (this.settings.paginationPrevNextButtonClass) {
            prevButton.className = this.settings.paginationPrevNextButtonClass;
        }
        this.paginationElement.appendChild(prevButton);

        if (!this.settings.paginationButtonsPerSide) {
            this.settings.paginationButtonsPerSide = 2;
        }

        // Genera botones de páginas anteriores a la página actual
        for (let i = Math.max(1, this.pagination.currentPage - this.settings.paginationButtonsPerSide); i < this.pagination.currentPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                this.pagination.currentPage = i;
                this.update();
            });
            if (this.settings.paginationButtonClass) {
                pageButton.className = this.settings.paginationButtonClass;
            }
            this.paginationElement.appendChild(pageButton);
        }

        // Agrega la página actual con estilo resaltado
        const currentPageButton = document.createElement('button');
        currentPageButton.textContent = this.pagination.currentPage;
        currentPageButton.disabled = true;
        if (this.settings.paginationButtonClass) {
            currentPageButton.className = this.settings.paginationButtonClass;
        }
        this.paginationElement.appendChild(currentPageButton);

        // Genera botones de páginas posteriores a la página actual
        for (let i = this.pagination.currentPage + 1; i <= Math.min(this.getTotalPages(), this.pagination.currentPage + this.settings.paginationButtonsPerSide); i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                this.pagination.currentPage = i;
                this.update();
            });
            if (this.settings.paginationButtonClass) {
                pageButton.className = this.settings.paginationButtonClass;
            }
            this.paginationElement.appendChild(pageButton);
        }

        // Botón "Siguiente"
        const nextButton = document.createElement('button');
        nextButton.textContent = this.settings.strings.pagination_next;
        nextButton.disabled = this.pagination.currentPage === this.getTotalPages();
        nextButton.addEventListener('click', () => {
            this.pagination.currentPage = this.pagination.currentPage + 1;
            this.update();
        });
        if (this.settings.paginationPrevNextButtonClass) {
            nextButton.className = this.settings.paginationPrevNextButtonClass;
        }
        this.paginationElement.appendChild(nextButton);
    }

    renderLabels() { }

    sortRowsByColumn(update = true) {
        this.sortedData = (this.settings.allowSearch && this.searchTerm.length > 0) ? [...this.searchResults] : [...this.data];

        // Restablecer el estado de ordenamiento de las otras columnas
        this.settings.headers.forEach((header, index) => {
            if (index !== this.sortColumnIndex) {
                header.sortDirection = 'default';
                this.clickCounts[index] = 0;
            }
        });

        // Restablecer el estado de ordenamiento de la columna clickeada
        const header = this.settings.headers[this.sortColumnIndex];
        header.sortDirection = 'asc';

        this.clickCounts[this.sortColumnIndex] += 1;

        if (this.clickCounts[this.sortColumnIndex] === 2) {
            // Segundo clic: ordenamiento descendente
            this.sortedData.sort((a, b) => {
                const aValue = a[header.alias];
                const bValue = b[header.alias];

                if (aValue < bValue) return 1;
                if (aValue > bValue) return -1;
                return 0;
            });

            header.sortDirection = 'desc';
        } else if (this.clickCounts[this.sortColumnIndex] === 3) {
            // Tercer clic: regresar al orden predeterminado (usando el orden original en this.data)
            this.sortedData = [...this.data]; // Utilizamos los datos originales sin filtrar
            this.filterRowsBySearchTerm();
            this.clickCounts[this.sortColumnIndex] = 0;
            header.sortDirection = 'default';
        } else {
            // Primer clic: ordenamiento ascendente
            this.sortedData.sort((a, b) => {
                const aValue = a[header.alias];
                const bValue = b[header.alias];

                if (aValue < bValue) return -1;
                if (aValue > bValue) return 1;
                return 0;
            });
        }

        if (update) {
            this.update();
        }
    }

    filterRowsBySearchTerm() {
        if (this.searchTerm.length === 0) {
            this.sortedData = [...this.data];
            this.searchResults = [...this.sortedData];
        } else {
            // Filtrar las filas que contienen el término de búsqueda en cualquier columna
            const filteredData = this.data.filter((row) => {
                return Object.values(row).some((cellValue) => {
                    const valueLowerCase = cellValue.toString().toLowerCase();
                    const searchTermLowerCase = this.searchTerm.toLowerCase();
                    return valueLowerCase.includes(searchTermLowerCase);
                });
            });

            // Ordenar los resultados de la búsqueda usando el mismo orden activo de la tabla
            const header = this.settings.headers[this.sortColumnIndex];
            const sortDirection = header.sortDirection;
            if (sortDirection === 'asc') {
                filteredData.sort((a, b) => {
                    const aValue = a[header.alias];
                    const bValue = b[header.alias];
                    if (aValue < bValue) return -1;
                    if (aValue > bValue) return 1;
                    return 0;
                });
            } else if (sortDirection === 'desc') {
                filteredData.sort((a, b) => {
                    const aValue = a[header.alias];
                    const bValue = b[header.alias];
                    if (aValue < bValue) return 1;
                    if (aValue > bValue) return -1;
                    return 0;
                });
            }

            this.sortedData = filteredData;
            this.searchResults = filteredData;
        }
        this.update();
    }


    // Método selectAllRows()
    selectAllRows() {
        if (this.settings.allowSelect) {
            if (this.mainCheckbox.checked) {
                this.element.querySelectorAll('table>tbody>tr>td:first-child ' + (this.settings.customSelectActionableSelector || 'input[type="checkbox"]')).forEach(checkbox => {
                    checkbox.checked = true;
                });
                if (this.searchTerm.length === 0) {
                    this.selectedElements = [...this.data];
                } else {
                    this.selectedElements = [...this.searchResults];
                }
            } else {
                this.element.querySelectorAll('table>tbody>tr>td:first-child ' + (this.settings.customSelectActionableSelector || 'input[type="checkbox"]')).forEach(checkbox => {
                    checkbox.checked = false;
                });
                this.selectedElements = [];
            }
        }
    }

    // Método unselectAllRows()
    unselectAllRows() {
        if (this.settings.allowSelect) {
            this.element.querySelectorAll('table>tbody>tr>td:first-child ' + (this.settings.customSelectActionableSelector || 'input[type="checkbox"]')).forEach(checkbox => {
                checkbox.checked = false;
            });
            if (this.searchTerm.length === 0) {
                this.selectedElements = [];
            } else {
                this.selectedElements = this.selectedElements.filter((item) => !this.searchResults.includes(item));
            }
        }
    }



    fetchData() {
        if (this.settings.serverSide) {
            let xhr = new XMLHttpRequest();
            let requestData = new FormData();
            if (this.settings.serverSettings.requestData) {
                this.settings.serverSettings.requestData.forEach(item => {
                    requestData.append(Object.keys(item)[0], Object.values(item)[0]);
                    console.log(Object.keys(item)[0], Object.values(item)[0]);
                });
            }
            if (this.settings.allowSearch && this.searchTerm) {
                requestData.append(this.settings.serverSettings.requestParamSearch, this.searchTerm);
            }
            if (this.settings.showPagination) {
                requestData.append(this.settings.serverSettings.requestParamPage, this.pagination.currentPage);
                requestData.append(this.settings.serverSettings.requestParamRecordsPerPage, this.pagination.recordsPerPage);
            }
            xhr.onloadstart = () => {
                this.selectedElements = [];
                this.element.setAttribute('disabled', '');
                this.pushTableRowMsg(this.settings.strings.fetching_data, true);
            }
            xhr.onreadystatechange = () => {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    let response = JSON.parse(xhr.responseText);
                    
                    this.data = response.data;
                    this.sortedData = response.data;
                    this.pagination.currentPage = response.currentPage;
                    this.pagination.recordsPerPage = response.recordsPerPage;
                    this.pagination.totalRecords = response.totalRecords;

                    this.update(false);
                    this.updatePagination();
                } else if (xhr.readyState == 4 && xhr.status != 200) {
                    alert("Fetch error");
                }
            }
            xhr.onerror = function (errorvt) {
                alert(errorvt.message);
            }
            xhr.onloadend = () => {
                this.element.removeAttribute('disabled');
            }
            xhr.open(this.settings.serverSettings.method, this.settings.serverURL);
            xhr.send(requestData);
        }
    }
    pushTableRowMsg(msg, clearTable = false) {
        if (clearTable) {
            if (!this.tbody) {
                this.renderBody();
            }
            this.removeChildNodes(this.tbody);
        }
        let tr = document.createElement('tr');
        let td = document.createElement('td');
        if (this.settings.headers) {
            td.colSpan = this.settings.headers.length + (this.settings.allowSelect ? 1 : 0);
        }
        td.textContent = msg;
        tr.appendChild(td);
        this.tbody.appendChild(tr);
    }
    removeChildNodes(element) {
        if (!element) {
            return;
        }
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
    getTotalPages() {
        return Math.ceil(this.sortedData.length / this.pagination.recordsPerPage);
    }
}