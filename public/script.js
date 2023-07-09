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
        const times = new Array();
        for(let i = 0; i < section_times.length; ++i) {
            const day = section_times[i].day;
            const start_time = section_times[i].start_time;
            const end_time = section_times[i].end_time;
            const duration = end_time - start_time;

            times.push(new Time(day, start_time,end_time, duration));
        }
        return times;
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
    const next_button = document.querySelector(".next_course");

    if(!next_button) {
        return;
    }

    const arr = JSON.parse(localStorage.getItem("course_data"));

    for(let i = 0; i < arr.length; ++i) {
        for(let j = 0; j < arr[i].length; ++j) {
            const code = arr[i][j].course_code;
            const type = arr[i][j].teach_method;
            const num = arr[i][j].section_number;
            const time = arr[i][j].time;

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
}

function create_permutations() {
    for(let i = 0; i < all_courses.length; ++i) {
        for(let j = 0; j < all_courses[i].length; ++j) {
            counter.push(new LimitNode(all_courses[i][j].length));
        }
    }
}

function create_schedule() {
    const next_button = document.querySelector(".next_course");

    if(!next_button) {
        return;
    }

    // calculate the number of total permutations
    total_permutations = permutations(counter);
    
    // loop through all permutations
    for(let i = 0; i < total_permutations; ++i) {
        const temp_schedule = new Array();
        let conflict = false;

        // initilize temporary schedule array with 5 days and 9 hours per day
        for(let j = 0; j < days_of_week.size; ++j) {
            temp_schedule[j] = new Array(max_hours_per_day);
        }

        // loop through all the selected courses
        for(let j = 0; j < all_courses.length; ++j) {
            for(let k = 0; k < all_courses[j].length; ++k) {
    
                // if the course type (lec, tut, pra) is not undefined
                if(all_courses[j][k][counter[j * 3 + k].count] != undefined) {
                    const course = all_courses[j][k][counter[j * 3 + k].count];
                    const time = course.section.section_times;
    
                    // loop through the times for the current course
                    for(let l = 0; l < time.length; ++l) {
                        for(let m = 0; m < time[l].duration; ++m) {

                            // if the time slot is empty then add it to the schedule
                            if(!temp_schedule[days_of_week.get(time[l].day)][time[l].start_time - 9 + m]) {
                                temp_schedule[days_of_week.get(time[l].day)][time[l].start_time - 9 + m] = course;
                            }
                            // otherwise raise the conflic flag
                            else {
                                conflict = true;
                            }
                        }
                    }
                }
            }
        }

        // if there were no conflicts then add it to the possible schedules
        if(!conflict) {
            schedule.push(temp_schedule);
        }
        // go to the next possible permutation
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

    if(!table) {
        return;
    }

    if(!schedule) {
        console.log("No schedule");
        return;
    }

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

async function get_info(course_code) {
    const res = await fetch(baseUrl + "course?key=" + course_code, {
      method: "GET"
    });

    const data = await res.text();
    return data;
}

async function get_info_selected(result) {
    const res = await fetch(baseUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(result)
    });

    const data = await res.text();
    return data;
}

function course_found(course_code) {
    const course_info = get_info(course_code);

    course_info.then(result => {
        // multiple results found
        if(JSON.parse(result)[0].course_name) {
            multiple_searches(JSON.parse(result), course_code);
        }
        // one result found
        else {
            add_course_to_storage(result, JSON.parse(result)[0].course_code);
        }
    });

    return true;
}

function add_course_to_storage(result, course_code) {
    if(!localStorage.getItem("course_data")) {
        localStorage.setItem("course_data", JSON.stringify(new Array()));
    }
    const arr = JSON.parse(localStorage.getItem("course_data"));
    arr.push(JSON.parse(result));
    localStorage.setItem("course_data", JSON.stringify(arr));

    console.log(course_code, "added to list");
}

function add_new_element(course_name) {
    const course_list = document.querySelector(".course_list");
    const item = document.createElement("li");
    const remove = document.createElement("span");

    remove.addEventListener("click", function() {
        item.removeChild(remove);
        course_list.removeChild(item);
        input_course_set.delete(item.innerHTML);
        localStorage.removeItem(item.innerHTML);
    });

    remove.appendChild(document.createTextNode("X"));
    item.appendChild(document.createTextNode(course_name));
    item.appendChild(remove);
    course_list.appendChild(item);
}

function searched() {
    const search_text = document.querySelector(".search_text");

    if(!search_text) {
        return;
    }

    // const courses = JSON.parse(localStorage.getItem("courses"));
    // if(courses) {
    //     for(let i = 0; i < courses.length; ++i) {
    //         console.log(courses[i]);
    //     }
    // }

    if(course_found(search_text.value) && !input_course_set.has(search_text.value)) {
        if(!localStorage.getItem("courses")) {
            localStorage.setItem("courses", JSON.stringify(new Array()));
        }
        const arr = JSON.parse(localStorage.getItem("courses"));
        arr.push(search_text.value);
        localStorage.setItem("courses", JSON.stringify(arr));
        input_course_set.add(search_text.value);

        add_new_element(search_text.value);
    }

    else {
        // course not found
    }

    const courses = JSON.parse(localStorage.getItem("courses"));
    const num_of_elements = document.querySelector(".course_list").childElementCount;

    if(courses && num_of_elements != courses.length) {
        for(let i = 0; i < courses.length; ++i) {
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
            });
    
            remove.appendChild(document.createTextNode("X"));
            item.appendChild(document.createTextNode(courses[i]));
            item.appendChild(remove);
            course_list.appendChild(item);
        }
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

function multiple_searches(results, search) {
    const pop_up = document.querySelector(".pop_up");
    const search_results = document.querySelector(".search_results");
    const searched = document.createElement("label");
    const close = document.createElement("button");

    pop_up.style.display = "flex";

    searched.appendChild(document.createTextNode("Search results for " + search));
    search_results.appendChild(searched);

    close.appendChild(document.createTextNode("X"));
    search_results.appendChild(close);

    close.addEventListener("click", function() {
        pop_up.style.display = "none";
        search_results.innerHTML = "";
    });

    for(let i = 0; i < results.length; ++i) {
        const item = document.createElement("li");
        item.style.cursor = "pointer";
        
        item.appendChild(document.createTextNode(results[i].course_code + ": " + results[i].course_name));
        search_results.appendChild(item);

        item.addEventListener("click", function() {
            const selected_result = get_info_selected(results[i]);
            pop_up.style.display = "none";
            search_results.innerHTML = "";

            selected_result.then(result => {
                add_course_to_storage(result, results[i].course_code);
            });

        });

        item.addEventListener("mouseover", function(){
            item.style.color = "blue";
        });

        item.addEventListener("mouseout", function(){
            item.style.color = "black";
        });
    }
}

const course_data = new Array();
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

const baseUrl = "http://localhost:3000/";

let course_count = 0;
let possibility_count = 0;
let total_permutations = 0;
const max_hours_per_day = 12;
const all_courses = new Array();
const counter = new Array();
const schedule = new Array();

parse_json();
create_permutations();
create_schedule();

course_search();
next_schedule_click();