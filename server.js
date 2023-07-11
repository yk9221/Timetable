const express = require("express");
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.json());

app.get("/:dynamic", (req, res) => {
    const {key} = req.query;

    const course_promise = get_matches(key);
    
    course_promise.then(result => {
        if(result.length == 0) {
            res.status(404).send(key + " not found");
        }
        else if(result.length == 1){
            let course_code = result[0].course_code;
            let course_name = result[0].course_name;
            let course_section = result[0].course_section;
            
            const course_info = get_course_info(course_code, course_name, course_section);

            course_info.then(data => {
                res.status(200).json(data);
            });
        }
        else {
            res.status(200).send(result);
        }
    });

});

async function get_matches(course) {
    let course_list;

    const url = "https://api.easi.utoronto.ca/ttb/getOptimizedMatchingCourseTitles?term=" + course + "&divisions=APSC&divisions=ARTSC&divisions=FPEH&divisions=MUSIC&divisions=ARCLA&divisions=ERIN&divisions=SCAR&sessions=Fall-Winter&sessions=20239&lowerThreshold=50&upperThreshold=200";

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

async function get_course_info(course_code, course_name, course_section) {
    let course_info;

    await fetch("https://api.easi.utoronto.ca/ttb/getPageableCourses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "courseCodeAndTitleProps":{
                "courseCode": course_code,
                "courseTitle": course_name,
                "courseSectionCode": course_section,
                "searchCourseDescription": false
            },
            "departmentProps": [],
            "campuses": [],
            "sessions": ["20239", "20239-20241"],
            "requirementProps": [],
            "instructor": "",
            "courseLevels": [],
            "deliveryModes": [],
            "dayPreferences": [],
            "timePreferences": [],
            "divisions": ["APSC", "ARTSC", "FPEH", "MUSIC", "ARCLA", "ERIN", "SCAR"],
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
        course_info = parse_course_info(course_code, data);
    })
    .catch(error => {
        console.log("Error: ", error);
    });

    return course_info;
}

function parse_matches(data) {
    const cheerio = require("cheerio");

    const full_html = cheerio.load(data);
    const code_elements = full_html("code");
    const name_elements = full_html("name");
    const section_elements = full_html("sectionCode");

    const course_list = new Array();

    const max_length = Math.max(code_elements.length, name_elements.length, section_elements.length);

    for(let i = 0; i < max_length; ++i) {
        if(i < section_elements.length) {
            const section_element = full_html(section_elements[i]);
            const section_parent = section_element.parent();

            if(section_parent.get(0).tagName == "codesandtitles") {
                course_list[i] = {
                    course_section: section_element.text()
                };
            }
        }

        if(i < name_elements.length) {
            const name_element = full_html(name_elements[i]);
            const name_parent = name_element.parent();

            if(name_parent.get(0).tagName == "codesandtitles") {
                course_list[i / 2] = Object.assign({course_name: name_element.text()}, course_list[i / 2]);
            }
        }

        if(i < code_elements.length) {
            const code_element = full_html(code_elements[i]);
            const code_parent = code_element.parent();

            if(code_parent.get(0).tagName == "codesandtitles") {
                course_list[i / 2] = Object.assign({course_code: code_element.text()}, course_list[i / 2]);
            }
        }
    }

    return course_list;
}

function parse_course_info(course_code, data) {
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

        if(section_parent.get(0).tagName == "sections") {
            const part_html = cheerio.load(section_element.html());
            const teach_method = part_html("teachmethod");
            const section_number = part_html("sectionnumber");
            const starts = part_html("start");
            const ends = part_html("end");

            course_info[i - 1] = {
                course_code: course_code,
                teach_method: teach_method.text(),
                section_number: section_number.text()
            };
            course_info[i - 1]["time"] = new Array();


            for(let j = 0; j < starts.length; ++j) {
                const start = part_html(starts[j]);
                const end = part_html(ends[j]);
                const day = start.text()[0];

                let same_time = false;
                const time_object = {
                    start_time: convert_miliseconds(start.text().substring(1)),
                    end_time: convert_miliseconds(end.text().substring(1)),
                    day: weekday_map.get(parseInt(day))
                };

                for(let k = 0; k < course_info[i - 1]["time"].length; ++k) {
                    if(JSON.stringify(course_info[i - 1]["time"][k]) == JSON.stringify(time_object)) {
                        same_time = true;
                    }
                }

                if(!same_time) {
                    course_info[i - 1]["time"].push(time_object);
                }
            }
        }
    }

    return course_info;
}

// convert miliseconds to 24 hour time
function convert_miliseconds(time) {
    const miliseconds_per_day = 86400000;
    const hours_per_day = 24;

    return time / miliseconds_per_day * hours_per_day;
}

app.post("/", (req, res) => {
    const course = req.body;

    let course_code = course.course_code;
    let course_name = course.course_name;
    let course_section = course.course_section;
    
    const course_info = get_course_info(course_code, course_name, course_section);

    course_info.then(data => {
        res.status(200).json(data);
    });

});

app.listen(port, () => console.log("Connected at http://localhost:" + port));