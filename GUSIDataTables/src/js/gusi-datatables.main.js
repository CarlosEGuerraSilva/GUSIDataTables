
class GUSIDataTable {
    selector;
    settings;
    data;
    sortedData;
    selectedElements;
    element;
    thead;
    tbody;
    clickCounts;

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
            paginationPlacement: "center",
            recordsToShow: [5, 10, 15],
            paginationButtonsPerSide: 3,

            sortable: false,

            serverSide: false,
            serverURL: null,
            serverSettings: {},
            strings: {}
        },
        data = []) {
        this.selector = selector;
        this.settings = settings;
        this.data = data;
        console.log("data", data);
        this.selectedElements = [];
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
                selection_records_selected: " records selected"
            }
        }
        if (this.settings.serverSide && !this.settings.serverSettings) {
            this.settings.serverSettings = {
                method: "POST",
                requestParamPage: "page",
                requestParamCurrent: "current",
                requestParamSearch: "search",
                requestData: []
            }
        }
        this.render();
        console.log(this.settings);
        console.log(this.settings.actionButtons);
    }

    render() {
        this.renderActionButtons();
        this.renderSearch();
        this.fetchData();
        if (!this.settings.renderFromSelector) {
            this.renderHeaders();
            this.renderRows();
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
        let destElement = document.querySelector(this.selector);
        destElement.parentNode.replaceChild(this.element, destElement);
    }

    parse() { }

    renderActionButtons() {
        if (!this.settings.actionButtons) {
            return null;
        }
        if (this.settings.actionButtons.length > 0) {
            let actionButtonsContainer = document.createElement('div');
            if (this.settings.actionButtonsContainerClass) {
                actionButtonsContainer.className = this.settings.actionButtonsContainerClass;
            }
            this.settings.actionButtons.forEach(button => {
                let actionButton = document.createElement('button');
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
                actionButtonsContainer.appendChild(actionButton);
            });
            this.element.append(actionButtonsContainer);
        }
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
            inputSearch.addEventListener('keyup', ()=>{
                this.filterRowsBySearchTerm(inputSearch.value);
            });
            this.element.appendChild(searchContainer);
        }
    }
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
                    mainCheckbox.checked ? this.selectAllRows() : this.unselectAllRows();
                });
                if (thSelect.childElementCount == 1) {
                    thSelect.style.width = 0;
                }
                tr.appendChild(thSelect);
            }

            // Variable para mantener el número de clics en cada columna
            //const clickCounts = this.settings.headers.map(() => 0);

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
                        this.sortRowsByColumn(columnIndex);
                        this.update();

                        // Remover todas las clases de ordenamiento de las th
                        this.thead.querySelectorAll('th').forEach(th => {
                            th.classList.remove('gusitable-order-asc', 'gusitable-order-desc', 'gusitable-order-default');
                        });

                        // Agregar la clase de ordenamiento correspondiente a la th clickeada
                        const sortDirection = this.settings.headers[columnIndex].sortDirection;
                        if (sortDirection === 'asc') {
                            th.classList.add('gusitable-order-asc');
                        } else if (sortDirection === 'desc') {
                            th.classList.add('gusitable-order-desc');
                        } else {
                            th.classList.add('gusitable-order-default');
                        }
                    });
                }

                th.textContent = thItem.label;
                tr.appendChild(th);
            });

            thead.appendChild(tr);
            this.thead = thead;
        }
    }

    renderRows() {
        let RowData = [];
        if (this.data.length == 0 && !this.settings.serverSide) {
            let tbody = document.createElement('tbody');
            let tr = document.createElement('tr');
            let td = document.createElement('td');
            if (this.settings.headers) {
                td.colSpan = this.settings.headers.length + (this.settings.allowSelect ? 1 : 0);
            }
            td.textContent = this.settings.strings.no_records;
            tr.appendChild(td);
            tbody.appendChild(tr);
            this.tbody = tbody;
            return null;
        }
        if (this.settings.serverSide) {

        }
        if (!this.settings.headers || this.data.length === 0) {
            return;
        }

        const tbody = document.createElement('tbody');
        this.data.forEach(item => {
            const tr = document.createElement('tr');

            if (this.settings.allowSelect) {
                const thSelect = document.createElement('th');
                const firstTd = document.createElement('td');

                if (this.settings.customSelectHTML) {
                    firstTd.innerHTML = this.settings.customSelectHTML;
                } else {
                    const check = document.createElement('input');
                    check.type = "checkbox";
                    firstTd.appendChild(check);
                }

                tr.appendChild(firstTd);

                // Evento para seleccionar o deseleccionar elementos
                const mainCheckbox = firstTd.querySelector(
                    this.settings.customSelectActionableSelector || 'input[type="checkbox"]'
                );

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
                    }
                });
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

            tbody.appendChild(tr);
        });

        this.tbody = tbody;

    }
    update() {
        console.log("actualizando...");
        if (!this.settings.headers || this.sortedData.length === 0) {
            return;
        }

        // Eliminar filas actuales del tbody
        while (this.tbody.firstChild) {
            this.tbody.removeChild(this.tbody.firstChild);
        }

        let tr = document.createElement('tr');

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
                }
            });

            tr.appendChild(firstTd);
        }

        this.sortedData.forEach(item => {
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
                    }
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
    }
    renderPagination() { }
    renderLabels() { }

    sortRowsByColumn(columnIndex) {
        if (!this.sortedData) {
            // Si this.sortedData aún no existe, clonamos los datos actuales para almacenarlos ordenados
            this.sortedData = [...this.data];
        }

        // Restablecer el estado de ordenamiento de la columna clickeada
        const header = this.settings.headers[columnIndex];
        header.sortDirection = 'asc';

        this.clickCounts[columnIndex] += 1;

        if (this.clickCounts[columnIndex] === 2) {
            // Segundo clic: ordenamiento descendente
            this.sortedData.sort((a, b) => {
                const aValue = a[header.alias];
                const bValue = b[header.alias];

                if (aValue < bValue) return 1;
                if (aValue > bValue) return -1;
                return 0;
            });

            header.sortDirection = 'desc';
        } else if (this.clickCounts[columnIndex] === 3) {
            // Tercer clic: regresar al orden predeterminado (usando el orden original en this.data)
            this.sortedData = [...this.data];
            this.clickCounts[columnIndex] = 0;
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
    }

    filterRowsBySearchTerm(searchTerm) {
        if (!searchTerm) {
            // Si no se proporciona un término de búsqueda, mostrar todas las filas
            this.sortedData = [...this.data];
        } else {
            // Filtrar las filas que contienen el término de búsqueda en cualquier columna
            const filteredData = this.data.filter((row) => {
                return Object.values(row).some((cellValue) => {
                    return cellValue.toString().toLowerCase().includes(searchTerm.toLowerCase());
                });
            });
            this.sortedData = filteredData;
        }
    
        // Actualizar la tabla con las filas filtradas
        this.update();
    }    

    selectAllRows() {
        if (this.settings.allowSelect) {
            this.element.querySelectorAll('table>tbody>tr>td:first-child').forEach(firstTd => {
                const mainCheckbox = firstTd.querySelector(
                    this.settings.customSelectActionableSelector || 'input[type="checkbox"]'
                );
                mainCheckbox.checked = true;
                mainCheckbox.dispatchEvent(new Event("change"));
            });
        }
    }
    unselectAllRows() {
        if (this.settings.allowSelect) {
            this.element.querySelectorAll('table>tbody>tr>td:first-child').forEach(firstTd => {
                const mainCheckbox = firstTd.querySelector(
                    this.settings.customSelectActionableSelector || 'input[type="checkbox"]'
                );
                mainCheckbox.checked = false;
                mainCheckbox.dispatchEvent(new Event("change"));
            });
        }
    }
    fetchData() { 
        if (condition) {
            
        }
    }
}