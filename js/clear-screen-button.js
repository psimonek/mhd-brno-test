let hideButtonState = false;

// Předpoklad: máte proměnnou map = L.map(...);

// Vytvoření vlastního tlačítka
const clearScreenButton = L.Control.extend({
    options: { position: 'topleft' }, // levý horní roh
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar my-custom-control');
        const btnhide = L.DomUtil.create('a', '', container);
        btnhide.id = 'hidebutton-id';
        btnhide.href = '#';
        btnhide.title = 'Moje funkce';
        btnhide.innerHTML = '<img src="img/hide-icon.png" height="18px" width="18px" style="padding-top:6px">'; // ikona/text tlačítka

        // Zabránit propagaci událostí do mapy (pohyb/zoom)
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);


        L.DomEvent.on(btnhide, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            // Vaše funkce zde
            if (!hideButtonState) {
                hideLayerByName(linkaCislo);
                btnhide.style.backgroundColor = 'orange';
                hideButtonState = true;
            } else {
                showLayerByName(linkaCislo);
                btnhide.style.backgroundColor = 'white';
                hideButtonState = false;
            }
        });

        return container;
    }
});

// Přidání ovládacího prvku do mapy
map.addControl(new clearScreenButton());
