// Vytvoření vlastního tlačítka
const filterLinesButton = L.Control.extend({
    options: { position: 'topleft' }, // levý horní roh
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar my-custom-control');
        const bttnfilter = L.DomUtil.create('a', '', container);
        bttnfilter.id = 'filterbutton-id';
        bttnfilter.href = '#';
        bttnfilter.title = 'Moje funkce';
        bttnfilter.innerHTML = '<img src="img/filter-icon.png" height="18px" width="18px" style="padding-top:6px">'; // ikona/text tlačítka

        // Zabránit propagaci událostí do mapy (pohyb/zoom)
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);


        L.DomEvent.on(bttnfilter, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            // Vaše funkce zde
            if (!filterButtonState) {
                filterLineNumber = linkaCislo;
                bttnfilter.style.backgroundColor = 'orange';
                filterLineNumber = linkaCislo;
                filterButtonState = true;

                for (const [id, marker] of vehicles.entries()) {
                    const ln = marker._lineName || marker.options.lineName; // fallback
                    // pokud nemáme lineName uložené v markeru, zkuste ho získat z popup/tooltip nebo jiné vlastnosti
                    if (String(ln) !== String(lineFilter)) {
                        try { map.removeLayer(marker); } catch(e) {}
                        vehicles.delete(id);
                    }
                }




            } else {
                showLayerByName(linkaCislo);
                bttnfilter.style.backgroundColor = 'white';
                filterLineNumber = 0;
                filterButtonState = false;
            }
        });

        return container;
    }
});

// Přidání ovládacího prvku do mapy
map.addControl(new filterLinesButton());
