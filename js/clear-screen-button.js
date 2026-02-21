// Předpoklad: máte proměnnou map = L.map(...);

// Vytvoření vlastního tlačítka
const clearScreenButton = L.Control.extend({
    options: { position: 'topleft' }, // levý horní roh
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar my-custom-control');
        const btn = L.DomUtil.create('a', '', container);
        btn.href = '#';
        btn.title = 'Moje funkce';
        btn.innerHTML = '<img src="img/hide-icon.png" height="18px" width="18px" style="padding-top:6px">'; // ikona/text tlačítka

        // Zabránit propagaci událostí do mapy (pohyb/zoom)
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        L.DomEvent.on(btn, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            // Vaše funkce zde
            console.log(cisloRel);
            //alert('Tlačítko stisknuto!');
            // nebo jiná logika, např. map.setView(...) apod.
        });

        return container;
    }
});

// Přidání ovládacího prvku do mapy
map.addControl(new clearScreenButton());
