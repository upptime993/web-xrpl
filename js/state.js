const state = {
    studentsData: [],
    galleryData: [],
    projectsData: [],
    strukturData: []
};
window.appState = state;

function setStudents(data) { state.studentsData = data; }
function setGallery(data) { state.galleryData = data; }
function setProjects(data) { state.projectsData = data; }
function setStruktur(data) { state.strukturData = data; }

window.setStudents = setStudents;
window.setGallery = setGallery;
window.setProjects = setProjects;
window.setStruktur = setStruktur;
