const express = require("express");
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.json());

// api fetch with get
app.get("/:dynamic", (req, res) => {
    // get the course code, faculty and sessions
    let {key} = req.query;
    let {faculty} = req.query;
    let {session} = req.query;

    // convert string to array
    if(!Array.isArray(faculty)) {
        faculty = new Array(faculty);
    }
    if(!Array.isArray(session)) {
        session = new Array(session);
    }

    // get the matches for the search
    const course_promise = get_matches(key, faculty, session);
    
    course_promise.then(result => {
        // if the course was not found
        if(result.length == 0) {
            res.status(404).send(key + " not found");
        }
        // if only one course was found
        else if(result.length == 1){
            let course_code = result[0].course_code;
            let course_name = result[0].course_name;
            let course_term = result[0].course_term;
            let course_description = result[0].course_description;
            
            // get the course info
            const course_info = get_course_info(course_code, course_name, course_term, course_description, faculty, session);

            course_info.then(data => {
                // return the course info
                res.status(200).json(data);
            });
        }
        // if multiple courses were found return the list of found courses
        else {
            res.status(200).send(result);
        }
    });

});

// get the matches
async function get_matches(course, faculty, session) {
    let course_list;
    let url = "https://api.easi.utoronto.ca/ttb/getOptimizedMatchingCourseTitles?term=" + course;

    // add the faculty to the url
    for(let i = 0; i < faculty.length; ++i) {
        url += "&divisions=" + faculty[i];
    }

    // add the sessions to the url
    for(let i = 0; i < session.length; ++i) {
        url += "&sessions=" + session[i];
    }

    url += "&lowerThreshold=50&upperThreshold=200";

    // send to uoft server
    await fetch(url)
    .then(response => response.text())
    .then(data => {
        course_list = parse_matches(data);
    })
    .catch(error => {
        console.log(error);
    });

    return course_list;
}

// get the course info
async function get_course_info(course_code, course_name, course_term, course_description, faculty, session) {
    let course_info;

    // send to uoft server
    await fetch("https://api.easi.utoronto.ca/ttb/getPageableCourses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "courseCodeAndTitleProps":{
                "courseCode": course_code,
                "courseTitle": course_name,
                "courseSectionCode": course_term,
                "searchCourseDescription": false
            },
            "departmentProps": [],
            "campuses": [],
            "sessions": session,
            "requirementProps": [],
            "instructor": "",
            "courseLevels": [],
            "deliveryModes": [],
            "dayPreferences": [],
            "timePreferences": [],
            "divisions": faculty,
            "creditWeights": [],
            "page": 1,
            "pageSize": 20,
            "direction": "asc"
        })
    })
    .then(response => {
        if(response.ok) {
            return response.text();
        }
        else {
            console.log("Error");
        }
    })
    .then(data => {
        // parse the course info
        course_info = parse_course_info(course_code, data, course_term, course_description);
    })
    .catch(error => {
        console.log("Error: ", error);
    });

    // return the course info
    return course_info;
}

// parse the matches to the search
function parse_matches(data) {
    const cheerio = require("cheerio");

    const full_html = cheerio.load(data);
    const code_elements = full_html("code");
    const name_elements = full_html("name");
    const section_elements = full_html("sectionCode");
    const description_elements = full_html("description");

    const course_list = new Array();

    const max_length = Math.max(code_elements.length, name_elements.length, section_elements.length, description_elements.length);

    for(let i = 0; i < max_length; ++i) {
        // add the course description
        if(i < description_elements.length) {
            const description_element = full_html(description_elements[i]);
            const description_parent = description_element.parent();

            if(description_parent.get(0).tagName == "codesandtitles") {
                course_list[i] = {
                    course_description: description_element.text()
                };
            }
        }

        // add the course term
        if(i < section_elements.length) {
            const section_element = full_html(section_elements[i]);
            const section_parent = section_element.parent();

            if(section_parent.get(0).tagName == "codesandtitles") {
                course_list[i] = Object.assign({course_term: section_element.text()}, course_list[i]);
                
            }
        }

        // add the course name
        if(i < name_elements.length) {
            const name_element = full_html(name_elements[i]);
            const name_parent = name_element.parent();

            if(name_parent.get(0).tagName == "codesandtitles") {
                course_list[i / 2] = Object.assign({course_name: name_element.text()}, course_list[i / 2]);
            }
        }

        // add the course code
        if(i < code_elements.length) {
            const code_element = full_html(code_elements[i]);
            const code_parent = code_element.parent();

            if(code_parent.get(0).tagName == "codesandtitles") {
                course_list[i / 2] = Object.assign({course_code: code_element.text()}, course_list[i / 2]);
            }
        }
    }

    // return the parsed course list
    return course_list;
}

// parse the course info
function parse_course_info(course_code, data, course_term, course_description) {
    const cheerio = require("cheerio");

    const weekday_map = new Map([
        [1, "Monday"],
        [2, "Tuesday"],
        [3, "Wednesday"],
        [4, "Thursday"],
        [5, "Friday"]
    ]);

    const course_info = new Array();

    const full_html = cheerio.load(data);
    const section_elements = full_html("sections");

    for(let i = 0; i < section_elements.length; ++i) {
        const section_element = full_html(section_elements[i]);
        const section_parent = section_element.parent();

        // if the html parent is "sections"
        if(section_parent.get(0).tagName == "sections") {
            const part_html = cheerio.load(section_element.html());
            const teach_method = part_html("teachmethod");
            const section_number = part_html("sectionnumber");
            const waitlist = part_html("currentWaitlist");
            const current_enrolment = part_html("currentEnrolment");
            const max_enrolment = part_html("maxEnrolment");
            const starts = part_html("start");
            const ends = part_html("end");
            const building_codes = part_html("buildingCode");
            // const building_room_numbers = part_html("buildingRoomNumber");
            const first_names = part_html("firstName");
            const last_names = part_html("lastName");

            // parse the desired info
            course_info[i - 1] = {
                course_code: course_code,
                course_term: course_term,
                teach_method: teach_method.text(),
                section_number: section_number.text(),
                course_description: course_description,
                waitlist: waitlist.text(),
                current_enrolment: current_enrolment.text(),
                max_enrolment: max_enrolment.text()
            };
            course_info[i - 1]["time"] = new Array();
            course_info[i - 1]["building"] = new Array();
            course_info[i - 1]["instructor"] = new Array();

            // parse the times for the course
            for(let j = 0; j < starts.length; ++j) {
                const start = part_html(starts[j]);
                const end = part_html(ends[j]);
                const day = start.text()[0];

                const building_code = part_html(building_codes[j]);
                // const building_room_number = part_html(building_room_numbers[j]);

                let same_time = false;
                const time_object = {
                    start_time: convert_miliseconds(start.text().substring(1)),
                    end_time: convert_miliseconds(end.text().substring(1)),
                    day: weekday_map.get(parseInt(day))
                };

                // if there are multiple of the same times
                for(let k = 0; k < course_info[i - 1]["time"].length; ++k) {
                    if(JSON.stringify(course_info[i - 1]["time"][k]) == JSON.stringify(time_object)) {
                        same_time = true;
                    }
                }

                if(!same_time) {
                    course_info[i - 1]["time"].push(time_object);
                }
                course_info[i - 1]["building"].push(building_code.text() /*+ " " + building_room_number.text()*/);
            }

            // parse the instructor info
            for(let j = 0; j < first_names.length; ++j) {
                const first_name = part_html(first_names[j]);
                const last_name = part_html(last_names[j]);

                course_info[i - 1]["instructor"].push(first_name.text() + " " + last_name.text());
            }
        }
    }

    // return the parsed course info
    return course_info;
}

// convert miliseconds to 24 hour time
function convert_miliseconds(time) {
    const miliseconds_per_day = 86400000;
    const hours_per_day = 24;

    return time / miliseconds_per_day * hours_per_day;
}

// api fetch with post
app.post("/", (req, res) => {
    const course = req.body;

    const course_code = course.course_code;
    const course_name = course.course_name;
    const course_term = course.course_term;
    const course_description = course.course_description;
    const faculty = course.faculty;
    const session = course.session;

    // get course info
    const course_info = get_course_info(course_code, course_name, course_term, course_description, faculty, session);

    course_info.then(data => {
        // return the course info
        res.status(200).json(data);
    });

});

// open server
app.listen(port, function() {
    console.log("Connected at http://localhost:" + port)
});
