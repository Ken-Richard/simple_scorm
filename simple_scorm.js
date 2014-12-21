// Safe Console Logging for older browsers
function log(msg) {
  if (window.console && SimpleScorm2004.logging_enabled) console.log(msg);
}

var SimpleScorm2004 = {

  //
  //  cmi.success_status:     passed, failed, unknown
  //  cmi.completion_success: completed, incomplete, not attempated
  //  cmi.mode:               browse, normal, review
  //

  data : { interactions : [] },
  last_error:         0,
  last_error_string:  "",
  saved_raw_score:    0,
  lastTransmit:       null,
  terminated:         false,
  on_data:            null,
  on_complete:        null,
  logging_enabled:    false,

  //////////////////////////////////////////////////////////////////
  //
  //
  // Launch
  //
  //

  start: function(scorm_data, on_data, on_complete) {
    log("Starting Simple Scorm")
    // a few defaults
    this.data['cmi.success_status'] = 'unknown';
    this.data['cmi.completion_status'] = 'not attempted';
    this.data['cmi.mode'] = 'normal';
    for (var key in scorm_data) {
      this.data[key] = scorm_data[key];
    }
    this.on_data = on_data;
    this.on_complete = on_complete;
    return this;
  },


  //////////////////////////////////////////////////////////////////
  //
  //
  // SCORM API
  //
  //

  Initialize : function(param) {
    this.SimpleScorm_ResetError();
    log("SimpleScorm2004::Initialize");
    return true;
  },

  Terminate : function(param) {
    this.terminated = true;
    this.SimpleScorm_ResetError();
    log("SimpleScorm2004::Terminate");
    setTimeout(function() {
      SimpleScorm2004.on_complete();
    },100);
    return "true"
  },

  GetValue : function(name) {
    this.SimpleScorm_ResetError();

    if (name == 'cmi.interactions._children') {
      value = 'id,type,objectives,timestamp,correct_responses,weighting,learner_response,result,latency,description,RO';
    } else if (name == 'cmi.interactions._count') {
      value = this.SimpleScorm_CountInteractions();
    } else if (name == 'cmi.score._children') {
      value = 'scaled,raw,min,max, RO';
    } else {
      value = this.data[name];
    }

    if (value != null) {
      log("SimpleScorm2004::GetValue  name=" + name + " value=" + value);
    } else {
      this.last_error = 403;
      this.last_error_string = "Data Model Element Value";
      log("SimpleScorm2004::GetValue  name=" + name + " ValueNotSet");
      value = "";
    }
    return value;
  },

  SetValue : function(name, value) {
    this.SimpleScorm_ResetError();
    this.data[name] = value;

    // We post data periodically back to the LMS to prevent
    // session timeouts if they are inside a lesson for
    // a long time
    this.SimpleScorm_CheckPing();

    log("SimpleScorm2004::SetValue name=" + name + " value=" + value);
    return true;
  },

  Commit : function(param) {
    this.SimpleScorm_ResetError();
    log("SimpleScorm2004::Commit");
    this.SimpleScorm_PostData();
    return true;
  },

  GetLastError : function() {
    log("SimpleScorm2004::GetLastError");
    return this.last_error;
  },

  GetErrorString : function(param) {
    log("SimpleScorm2004::GetErrorString");
    return this.last_error_string;
  },

  GetDiagnostic : function(param) {
    log("SimpleScorm2004::GetDiagnostic");
    return "";
  },


  //////////////////////////////////////////////////////////////////
  //
  //
  // Our helper functions
  //
  //

  // Update a value in memory
  SimpleScorm_updateData : function(hash,field) {
    if (hash[field]) {
      this.data[field] = hash[field];
      log("Setting from LMS: " + field + " = " + this.data[field]);
    }
  },

  // When was the last time we pinged the server?
  // If too long then post data
  SimpleScorm_CheckPing : function() {
    if (this.lastTransmit) {
      var current = new Date().getTime();
      var diff = current - this.lastTransmit;
      /* Over 5 minutes? Keep Alive */
      if (diff > 300000) {
        this.SimpleScorm_PostData();
      }
    }
  },

  // How many interactions?
  SimpleScorm_CountInteractions : function () {
    var interactionCount = 0;
    while (this.data["cmi.interactions." + interactionCount + ".id"] != null) {
      interactionCount++;
    }
    return interactionCount;
  },

  // Reset the last error
  SimpleScorm_ResetError : function() {
    this.last_error = 0;
    this.last_error_string = "";
  },

  // Post to the LMS
  SimpleScorm_PostData : function() {
    log("SimpleScorm2004::SimpleScorm_PostData");
    this.lastTransmit = new Date().getTime();
    SimpleScorm2004.on_data(this.data);
  }

}
