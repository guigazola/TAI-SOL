
function Project(name) {
  this._name = name;
  this._state = Project.State.STOPPED;
  this._timeSpentInPreviousIterations = 0;
  this._currentIterationStartTime = 0;

  this._onChange = null;
}


Project.State = {
  STOPPED: "stopped",
  RUNNING: "running"
}

Project.prototype = {

  getName:  function() {
    return this._name;
  },

 
  getState: function() {
    return this._state;
  },

 
  isStopped: function() {
    return this._state == Project.State.STOPPED;
  },

 
  isRunning: function() {
    return this._state == Project.State.RUNNING;
  },


  setOnChange: function(onChange) {
    this._onChange = onChange;
  },

 
  _getCurrentIterationTime: function() {
    return (new Date).getTime() - this._currentIterationStartTime;
  },

 
  getTimeSpent: function() {
    var result = this._timeSpentInPreviousIterations;
    if (this._state == Project.State.RUNNING) {
      result += this._getCurrentIterationTime();
    }
    return result;
  },

  
  _callOnChange: function() {
    if (typeof this._onChange == "function") {
      this._onChange();
    }
  },

 
  start: function() {
    if (this._state == Project.State.RUNNING) { return };

    this._state = Project.State.RUNNING;
    this._currentIterationStartTime = (new Date).getTime();
    this._callOnChange();
  },

  
  stop: function() {
    if (this._state == Project.State.STOPPED) { return };

    this._state = Project.State.STOPPED;
    this._timeSpentInPreviousIterations += this._getCurrentIterationTime();
    this._currentIterationStartTime = 0;
    this._callOnChange();
  },

 
  reset: function() {
    this.stop();
    this._timeSpentInPreviousIterations = 0;
    this._callOnChange();
  },

  
  serialize: function() {
   
    return [
      encodeURIComponent(this._name),
      this._state,
      this._timeSpentInPreviousIterations,
      this._currentIterationStartTime
    ].join("&");
  },

 
  deserialize: function(serialized) {
    var parts = serialized.split("&");

    this._name                          = decodeURIComponent(parts[0]);
    this._state                         = parts[1];
    this._timeSpentInPreviousIterations = parseInt(parts[2]);
    this._currentIterationStartTime     = parseInt(parts[3]);
  }
}


function Projects() {
  this._projects = [];

  this._onAdd = null;
  this._onRemove = null;
}

Projects.prototype = {
  
  setOnAdd: function(onAdd) {
    this._onAdd = onAdd;
  },

 
  setOnRemove: function(onRemove) {
    this._onRemove = onRemove;
  },

  
  length: function() {
    return this._projects.length
  },

  
  get: function(index) {
    return this._projects[index];
  },

  
  forEach: function(callback) {
    for (var i = 0; i < this._projects.length; i++) {
      callback(this._projects[i], i, this);
    }
  },

  
  _callOnAdd: function(project) {
    if (typeof this._onAdd == "function") {
      this._onAdd(project);
    }
  },

 
  add: function(project) {
    this._projects.push(project);
    this._callOnAdd(project);
  },

  
  _callOnRemove: function(index) {
    if (typeof this._onRemove == "function") {
      this._onRemove(index);
    }
  },


  remove: function(index) {
    this._callOnRemove(index);
    this._projects.splice(index, 1);
  },

  
  serialize: function() {
    var serializedProjects = [];
    this.forEach(function(project) {
      serializedProjects.push(project.serialize());
    });
    return serializedProjects.join("|");
  },

  
  deserialize: function(serialized) {
    
    while (this._projects.length > 0) {
      this.remove(0);
    }

    var serializedProjects = serialized.split("|");
    for (var i = 0; i < serializedProjects.length; i++) {
      var project = new Project("");
      project.deserialize(serializedProjects[i]);
      this.add(project);
    }
  }
}


String.prototype.pad = function(length, padding) {
  var result = this;
  while (result.length < length) {
    result = padding + result;
  }
  return result;
}


var projects = new Projects();


var lastSerializedProjectsString;


var PROJECTS_DOM_STORAGE_KEY = "timerProjects";


function getStorage() {

  if (window.localStorage !== undefined) {
    return window.localStorage;
  } else if (window.globalStorage !== undefined) {
    return window.globalStorage[location.hostname];
  } else {
    return null;
  }
}


function saveProjects() {
  var serializedProjectsString = projects.serialize();
  getStorage()[PROJECTS_DOM_STORAGE_KEY] = serializedProjectsString;
  lastSerializedProjectsString = serializedProjectsString;
}


function loadSerializedProjectsString() {
  var storedValue = getStorage()[PROJECTS_DOM_STORAGE_KEY];
 
  if (storedValue !== null && storedValue !== undefined) {
 
    return (window.localStorage === undefined) ? storedValue.value : storedValue;
  } else {
    return undefined;
  }
}


function loadProjects() {
  var serializedProjectsString = loadSerializedProjectsString();
  if (serializedProjectsString !== undefined) {
    projects.deserialize(serializedProjectsString);
    lastSerializedProjectsString = serializedProjectsString;
  }
}


function projectsHaveChangedOutsideApplication() {
  return loadSerializedProjectsString() != lastSerializedProjectsString;
}


var MILISECONDS_IN_SECOND = 1000;
var MILISECONDS_IN_MINUTE = 60 * MILISECONDS_IN_SECOND;
var MINUTES_IN_HOUR       = 60;

/* Formats the time in the H:MM format. */
function formatTime(time) {
  var timeInMinutes = time / MILISECONDS_IN_MINUTE;
  var hours = Math.floor(timeInMinutes / MINUTES_IN_HOUR);
  var minutes = Math.floor(timeInMinutes - hours * MINUTES_IN_HOUR);
  return hours + ":" + String(minutes).pad(2, "0");
}

/*
 * Computes the URL of the image in the start/stop link according to the project
 * state.
 */
function computeStartStopLinkImageUrl(state) {
  switch (state) {
    case Project.State.STOPPED:
      return "img/start.png";
    case Project.State.RUNNING:
      return "img/stop.png";
    default:
      throw "Invalid project state."
  }
}


function buildProjectRow(project, index) {
  var result = $("<tr />");

  var startStopLink = $(
    "<a href='#' class='start-stop-link' title='Start/stop'>"
    + "<img src='" + computeStartStopLinkImageUrl(project.getState()) + "' width='16' height='16' alt='Start/stop' />"
    + "</a>"
  );
  startStopLink.click(function() {
    switch (project.getState()) {
      case Project.State.STOPPED:
        project.start();
        break;
      case Project.State.RUNNING:
        project.stop();
        break;
      default:
        throw "Invalid project state."
    }
    saveProjects();
    return false;
  });

  var resetLink = $(
    "<a href='#' title='Reset'>"
    + "<img src='img/reset.png' width='16' height='16' alt='Reset' />"
    + "</a>"
  );
  resetLink.click(function() {
    project.reset();
    saveProjects();
    return false;
  });

  var deleteLink = $(
    "<a href='#' title='Delete'>"
    + "<img src='img/delete.png' width='16' height='16' alt='Delete' />"
    + "</a>"
  );
  deleteLink.click(function() {
    if (confirm("Do you really want to delete delete project \"" + project.getName() + "\"?")) {
      projects.remove(index);
      saveProjects();
    }
    return false;
  });

  result
    .addClass("state-" + project.getState())
    .append($("<td class='project-name' />").text(project.getName()))
    .append($("<td class='project-time' />").text(formatTime(project.getTimeSpent())))
    .append($("<td class='project-actions' />")
      .append(startStopLink)
      .append(resetLink)
      .append("&nbsp;&nbsp;")
      .append(deleteLink)
    );

  return result;
}


function findRowWithIndex(index) {
  return $("#project-table").find("tr").slice(1).eq(index);
}


function updateProjectRow(row, project) {
  if (project.isStopped()) {
    row.removeClass("state-running");
    row.addClass("state-stopped");
  } else if (project.isRunning()) {
    row.removeClass("state-stopped");
    row.addClass("state-running");
  }

  row.find(".project-time").text(formatTime(project.getTimeSpent()))
  row.find(".start-stop-link img").attr(
    "src",
    computeStartStopLinkImageUrl(project.getState())
  );
}


function initializeProjectsEventHandlers() {
  projects.setOnAdd(function(project) {
    var row = buildProjectRow(project, projects.length() - 1);
    $("#project-table").append(row);
    project.setOnChange(function() {
      updateProjectRow(row, project);
    });
  });

  projects.setOnRemove(function(index) {
    findRowWithIndex(index).remove();
  });
}

/* Initializes GUI event handlers. */
function initializeGuiEventHandlers() {
  $("#add-project-button").removeAttr("disabled");
  $("#add-project-button").click(function() {
    var projectName = prompt("Enter project name:", "");
    if (projectName === null) { return; }

    var project = new Project(projectName);
    projects.add(project);
    saveProjects();
  });
}


function initializeTimer() {
  setInterval(function() {
    projects.forEach(function(project, index) {
      updateProjectRow(findRowWithIndex(index), project);
    });

    if (projectsHaveChangedOutsideApplication()) {
      loadProjects();
    }
  }, 10 * MILISECONDS_IN_SECOND);
}


$(document).ready(function(){
  try {
    if (!getStorage()) {
      alert("ERR0");
      return;
    }
  } catch (e) {
    alert("Timer does not work with file: URLs in Firefox.");
    return;
  }

  initializeProjectsEventHandlers();
  loadProjects();
  initializeGuiEventHandlers();
  initializeTimer();
});
