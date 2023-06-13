'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = String(Date.now()).slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
      'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}
    `;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();

    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();

    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / this.duration;
    return this.speed;
  }
}

class App {
  #map;
  #currentLatlng;
  #workouts = [];

  constructor() {
    this._getPosition();

    // Get data from storage

    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));

    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
        alert('Could not get your position');
      });
    }
  }

  _loadMap({ coords }) {
    const currentLocation = [coords.latitude, coords.longitude];

    this.#map = L.map('map').setView(currentLocation, 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach((work) => this._renderWorkoutMarker(work));
  }

  _showForm({ latlng }) {
    this.#currentLatlng = latlng;

    form.classList.remove('hidden');
    form.style.display = 'grid';
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = null;
    form.style.display = 'none';
    form.classList.add('hidden');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const isValidNumber = (...args) =>
      args.every((arg) => Number.isFinite(arg) && arg >= 0);

    e.preventDefault();

    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    const { lat, lng } = this.#currentLatlng;
    let workout;

    if (type === 'running') {
      const cadence = Number(inputCadence.value);

      if (!isValidNumber(distance, duration, cadence))
        return alert('You have to write positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    } else if (type === 'cycling') {
      const elevation = Number(inputElevation.value);
      if (!isValidNumber(distance, duration))
        return alert('You have to write positive number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.#workouts.push(workout);

    this._hideForm();

    this._renderWorkoutMarker(workout, type);
    this._renderWorkout(workout);

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnEscapeKey: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(workout.description)
      .openPopup();
  }

  _renderWorkout({
    type,
    id,
    distance,
    duration,
    cadence,
    pace,
    speed,
    elevation,
    description,
  }) {
    let html = `<li class="workout workout--${type}" data-id="${id}">
          <h2 class="workout__title">${description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    else
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToMarker({ target }) {
    const workoutEl = target.closest('.workout');

    if (workoutEl) {
      const workout = this.#workouts.find(
        (work) => work.id === workoutEl.dataset.id
      );

      this.#map.setView(workout.coords, 13, {
        animate: true,
      });
    }
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (data) {
      this.#workouts = data;

      this.#workouts.forEach((work) => this._renderWorkout(work));
    }
  }
}

const app = new App();
