const element1 = document.getElementById('ok-tab');
const element2 = document.getElementById('warning-tab');
const element3 = document.getElementById('error-tab');

const element4 = document.getElementById('section1');
const element5 = document.getElementById('section2');
const element6 = document.getElementById('section3');

// Fonction pour ouvrir un onglet
function openTab(evt, tabName) {
    var tabcontent = document.getElementsByClassName("tabcontent");
    for (var i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    var tablinks = document.getElementsByClassName("tablink");
    for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}
element1.addEventListener('mousedown', (evt) => openTab(evt, 'ok'));
element2.addEventListener('mousedown', (evt) => openTab(evt, 'warning'));
element3.addEventListener('mousedown', (evt) => openTab(evt, 'error'));


// Fonction pour afficher la section principale
function showSection(evt, sectionId) {
    // Masquer toutes les sections
    var sections = document.querySelectorAll('main > section');
    sections.forEach(function(section) {
        section.style.display = 'none';
    });

    // Afficher la section sélectionnée
    document.getElementById(sectionId).style.display = 'block';

    // Supprimer l'état actif des liens de navigation
    var navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(function(link) {
        link.classList.remove('active');
    });

    // Ajouter une classe active au lien sélectionné
    evt.currentTarget.classList.add('active');
}
element4.addEventListener('mousedown', (evt) => showSection(evt, 'test-execution'));
element5.addEventListener('mousedown', (evt) => showSection(evt, 'configuration-management'));
element6.addEventListener('mousedown', (evt) => showSection(evt, 'results-dashboard'));

// Initialiser l'onglet par défaut au chargement de la page
document.addEventListener("DOMContentLoaded", function() {
    // Ouvrir la section par défaut
    showSection({currentTarget: {classList: {add: function() {}}}}, 'test-execution'); // Simuler l'événement pour afficher la section par défaut
    document.querySelector('.tablink').click(); // Ouvrir le premier onglet par défaut dans le tableau de bord
});