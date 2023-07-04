import data from "./data.json" assert{type: "json"};

class Course {
    constructor(course_code, section) {
        this.course_code = course_code;
        this.section = section;
    }
};

class Section {
    constructor(section_type, section_num, section_times) {
        this.section_type = section_type;
        this.section_num = section_num;
        this.section_times = this.parse_time(section_times);
    }

    parse_time(section_times) {
        let times = []
        for(let i = 0; i < section_times.length; ++i) {
            let day = this.find_day(section_times[i]);
            let start_time = this.find_start_time(section_times[i]);
            let end_time = this.find_end_time(section_times[i]);
            let duration = this.find_duration(start_time, end_time);

            times.push(new Time(day, start_time,end_time, duration));
        }
        return times;
    }

    find_day(time) {
        for(let i = 0; i < time.length; ++i) {
            if(time[i] == " ") {
                return time.substring(0, i);
            }
        }
    }

    find_start_time(time) {
        let space_index = 0;
        let colon_index = 0;

        for(let i = 0; i < time.length; ++i) {
            if(time[i] == " ") {
                space_index = i;
            }
            if(time[i] == ":") {
                colon_index = i;

                let start_time = parseInt(time.substring(space_index + 1, colon_index));
                return start_time < 9 ? start_time + 12 : start_time;
            }
        }
    }

    find_end_time(time) {
        let dash_index = 0;
        let colon_index = 0;

        let colon_count = 0;

        for(let i = 0; i < time.length; ++i) {
            if(time[i] == "-") {
                dash_index = i;
            }
            if(time[i] == ":") {
                colon_index = i;
                if(colon_count == 0) {
                    colon_count++;
                    continue;
                }

                let end_time = parseInt(time.substring(dash_index + 2, colon_index));
                return end_time < 9 ? end_time + 12 : end_time;
            }
        }
    }

    find_duration(start_time, end_time) {
        return end_time - start_time;
    }
};

class Time {
    constructor(day, start_time, end_time, duration) {
        this.day = day
        this.start_time = start_time
        this.end_time = end_time
        this.duration = duration
    }
};

class LimitNode {
    constructor(limit) {
        this.count = 0;
        this.limit = limit;
    }
};

function parse_json() {
    for(let i = 0; i < data.length; ++i) {
        let code = data[i].code;
        let section_length = data[i].section.length;
        let type = data[i].section.substring(0, section_length / 2);
        let num = data[i].section.substring(section_length / 2, section_length);
        let time = data[i].time;
    
        if(!course_code_map.has(code)) {
            all_courses[course_count] = new Array();
            all_courses[course_count][course_section_map.get("LEC")] = new Array();
            all_courses[course_count][course_section_map.get("TUT")] = new Array();
            all_courses[course_count][course_section_map.get("PRA")] = new Array();
    
            course_code_map.set(code, course_count);
            course_count++;
        }
        all_courses[course_code_map.get(code)][course_section_map.get(type)].push(new Course(code, new Section(type, num, time)));
    }
}

function create_permutations() {
    for(let i = 0; i < all_courses.length; ++i) {
        for(let j = 0; j < all_courses[i].length; ++j) {
            counter.push(new LimitNode(all_courses[i][j].length));
        }
    }
}

function create_schedule() {
    total_permutations = permutations(counter);
    
    for(let i = 0; i < total_permutations; ++i) {
        const temp_schedule = new Array();
        let conflict = false;
        for(let j = 0; j < days_of_week.size; ++j) {
            temp_schedule[j] = new Array(max_hours_per_day);
        }
        for(let j = 0; j < all_courses.length; ++j) {
            for(let k = 0; k < all_courses[j].length; ++k) {
    
                if(all_courses[j][k][counter[j * 3 + k].count] != undefined) {
                    const course = all_courses[j][k][counter[j * 3 + k].count];
                    const time = course.section.section_times;
    
    
                    for(let l = 0; l < time.length; ++l) {
                        for(let m = 0; m < time[l].duration; ++m) {
                            if(!temp_schedule[days_of_week.get(time[l].day)][time[l].start_time - 9 + m]) {
                                temp_schedule[days_of_week.get(time[l].day)][time[l].start_time - 9 + m] = course;
                            }
                            else {
                                conflict = true;
                            }
                        }
                    }
                }
            }
    
        }
    
        if(!conflict) {
            schedule.push(temp_schedule);
        }
    
        add_one(counter);
    }
}

function add_one(counter) {
    for(let i = counter.length - 1; i >= 0; --i) {
        if(counter[i].count < counter[i].limit - 1) {
            counter[i].count++;
            reset_after(counter, i + 1);
            break;
        }
    }
}
function reset_after(counter, index) {
    for(let i = index; i < counter.length; ++i) {
        counter[i].count = 0;
    }
}

function permutations(counter) {
    let total = 1;
    for(let i = 0; i < counter.length; ++i) {
        if(counter[i].limit != 0) {
            total *= counter[i].limit;
        }
    }
    return total;
}

function print_schedule(schedule) {
    const table = document.querySelector(".table");
    const save_button = document.querySelector(".save_button");

    if(!table || !save_button) {
        return;
    }

    table.style.display = "block";
    save_button.style.display = "block";

    save_button.addEventListener("click", function() {
        localStorage.setItem("saved", JSON.stringify(schedule));
        let arr = JSON.parse(localStorage.getItem("saved"));
        print_on_table(arr);
    });

    print_on_table(schedule);
}

function print_on_table(schedule) {
    const table = document.querySelector(".table");

    for(let i = 0; i < schedule.length; ++i) {
        for(let j = 0; j < schedule[i].length; ++j) {
            if(schedule[i][j]) {
                table.rows[j + 1].cells[i + 1].innerHTML = "<b>" + schedule[i][j].course_code + "</b>" + "<br>" + schedule[i][j].section.section_type + schedule[i][j].section.section_num;
                table.rows[j + 1].cells[i + 1].style.backgroundColor = colors.get(course_code_map.get(schedule[i][j].course_code));
            }
            else {
                table.rows[j + 1].cells[i + 1].innerHTML = "";
                table.rows[j + 1].cells[i + 1].style.backgroundColor = "white";
            }
        }
    }
}

function next_schedule_click() {
    const next_button = document.querySelector(".next_course");
    const caption = document.querySelector(".table_caption");

    if(!next_button || !caption) {
        return;
    }

    next_button.addEventListener("click", function() {
        print_schedule(schedule[possibility_count % schedule.length]);
        caption.innerHTML = "Timetable " + (possibility_count % schedule.length + 1) + "/" + schedule.length;
        possibility_count++;
    });
}

async function postData(url = "", data = {}) {
    const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        redirect: "follow",
        referrerPolicy: "no-referrer",
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
        },
        body: JSON.stringify(data),
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.log(error);
    })
    return response.json();
}

function course_found() {
    let body = {
        courseCodeAndTitleProps: {
            courseCode: "ECE302H1",
            courseTitle: "Probability and Applications",
        },
        departmentProps:[],
        campuses:[],
        sessions:["20239","20241","20239-20241"],
        requirementProps:[],
        instructor:"",
        courseLevels:[],
        deliveryModes:[],
        dayPreferences:[],
        timePreferences:[],
        divisions:["APSC"],
        creditWeights:[],
        page:1,
        pageSize:20,
        direction:"asc"
    }
    // postData("https://api.easi.utoronto.ca/ttb/getPageableCourses", body).then((data) => {
    //     console.log(data);
    // });



    return true;
}

function searched() {
    const search_text = document.querySelector(".search_text");

    if(!search_text) {
        return;
    }

    if(course_found(search_text.value) && !input_course_set.has(search_text.value)) {
        if(!localStorage.getItem("courses")) {
            localStorage.setItem("courses", JSON.stringify(new Array()));
        }
        const arr = JSON.parse(localStorage.getItem("courses"));
        arr.push(search_text.value);
        localStorage.setItem("courses", JSON.stringify(arr));
        input_course_set.add(search_text.value);

        const course_list = document.querySelector(".course_list");
        const item = document.createElement("li");
        const remove = document.createElement("span");

        remove.addEventListener("click", function() {
            item.removeChild(remove);
            course_list.removeChild(item);
            input_course_set.delete(item.innerHTML);
            localStorage.removeItem(item.innerHTML);

            console.log(localStorage);
            console.log(input_course_set);
        })

        remove.appendChild(document.createTextNode("X"));
        item.appendChild(document.createTextNode(search_text.value));
        item.appendChild(remove);
        course_list.appendChild(item);
    }

    else {
        // course not found
    }

    search_text.value = "";
}

function course_search() {
    const search_button = document.querySelector(".search_button");
    const search_text = document.querySelector(".search_text");

    if(!search_button || !search_text) {
        return;
    }

    window.addEventListener("keydown", function(event) {
        if(event.key == "Enter") {
            searched();
        }
    });
    
    search_button.addEventListener("click", function() {
        searched();
    });
}

const input_course_set = new Set();
const course_code_map = new Map();
const course_section_map = new Map([
    ["LEC", 0],
    ["TUT", 1],
    ["PRA", 2]
]);
const days_of_week = new Map([
    ["Monday", 0],
    ["Tuesday", 1],
    ["Wednesday", 2],
    ["Thursday", 3],
    ["Friday", 4]
]);
const colors = new Map([
    [0, "purple"],
    [1, "green"],
    [2, "orange"],
    [3, "pink"],
    [4, "yellow"],
    [5, "blue"],
    [6, "red"]
]);

let course_count = 0;
let possibility_count = 0;
let total_permutations = 0;
const max_hours_per_day = 9;
const all_courses = new Array();
const counter = new Array();
const schedule = new Array();

parse_json();
create_permutations();
create_schedule();

course_search();
next_schedule_click();