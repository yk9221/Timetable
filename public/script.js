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
    const arr = JSON.parse(localStorage.getItem("course_data"));
    const exclude = JSON.parse(localStorage.getItem("exclude"));
    
    if(!arr) {
        return;
    }

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

            let remove = false;
            if(exclude) {
                for(let k = 0; k < exclude.length; ++k) {
                    if(exclude[k].course_code == code &&
                        exclude[k].teach_method == type &&
                        exclude[k].section_number == num) {
                            remove = true;
                    }
                }
            }

            if(!remove) {
                all_courses[course_code_map.get(code)][course_section_map.get(type)].push(new Course(code, new Section(type, num, time)));
            }
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
    const prev_button = document.querySelector(".previous_course");
    const table_in_table = document.querySelector(".table_in_table");

    if((!next_button || !prev_button || all_courses.length == 0) && !table_in_table) {
        return;
    }
    
    // calculate the number of total permutations
    total_permutations = permutations(counter);
    
    // loop through all permutations
    for(let i = 0; i < total_permutations; ++i) {
        if(table_in_table && schedule.length >= overview_start + table_height * table_width || check_counter_reached(counter)) {
            break;
        }
        const temp_schedule = new Array();
        let conflict = false;

        // initilize temporary schedule array with 5 days and 9 hours per day
        for(let j = 0; j < days_of_week.size; ++j) {
            temp_schedule[j] = new Array(max_hours_per_day);
        }

        // loop through all the selected courses
        for(let j = 0; j < all_courses.length && !conflict; ++j) {
            for(let k = 0; k < all_courses[j].length && !conflict; ++k) {
    
                // if the course type (lec, tut, pra) is not undefined
                if(all_courses[j][k][counter[j * 3 + k].count] != undefined) {
                    const course = all_courses[j][k][counter[j * 3 + k].count];
                    const time = course.section.section_times;
    
                    // loop through the times for the current course
                    for(let l = 0; l < time.length && !conflict; ++l) {
                        for(let m = 0; m < time[l].duration && !conflict; ++m) {

                            // if the time slot is empty then add it to the schedule
                            if(!temp_schedule[days_of_week.get(time[l].day)][time[l].start_time - 9 + m]) {
                                temp_schedule[days_of_week.get(time[l].day)][time[l].start_time - 9 + m] = course;
                            }
                            // otherwise raise the conflict flag
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

function check_counter_reached(counter) {
    for(let i = 0; i < counter.length; ++i) {
        if(counter[i].limit != 0 && counter[i].count != counter[i].limit - 1) {
            return false;
        }
    }
    return true;
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

    if(!table || !save_button || !schedule) {
        return;
    }


    save_button.addEventListener("click", function() {
        localStorage.setItem("saved", JSON.stringify(schedule));
    });

    print_on_table(schedule, table);
}

function print_on_table(schedule, table) {
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

function next_schedule(caption) {
    if(!caption) {
        return;
    }

    possibility_count++;
    if(possibility_count % (schedule.length + 1) == 0) {
        possibility_count++;
    }

    print_schedule(schedule[possibility_count % (schedule.length + 1) - 1]);
    caption.style.fontWeight = "bold";
    caption.innerHTML = "Timetable " + (possibility_count % (schedule.length + 1)) + "/" + schedule.length;
}

function previous_schedule(caption) {
    if(!caption) {
        return;
    }

    possibility_count--;
    if(possibility_count % (schedule.length + 1) == 0) {
        possibility_count--;
    }
    if(possibility_count % (schedule.length + 1) < 0) {
        possibility_count += schedule.length + 1;
    }

    print_schedule(schedule[possibility_count % (schedule.length + 1) - 1]);
    caption.style.fontWeight = "bold";
    caption.innerHTML = "Timetable " + (possibility_count % (schedule.length + 1)) + "/" + schedule.length;
}

function schedule_click() {
    const next_button = document.querySelector(".next_course");
    const prev_button = document.querySelector(".previous_course");
    const caption = document.querySelector(".table_caption");

    next_schedule(caption);

    if(!next_button || !caption || !prev_button) {
        return;
    }

    next_button.addEventListener("click", function() {
        next_schedule(caption);
    });

    prev_button.addEventListener("click", function() {
        previous_schedule(caption);
    });
}

function print_zoomed_schedule(number) {
    const schedule_zoom = document.querySelector(".schedule_zoom");
    const clicked_schedule = document.querySelector(".clicked_schedule");
    const overview_table = document.querySelector(".overview_table");
    const overview_table_caption = document.querySelector(".overview_table_caption");
    const close_table = document.querySelector(".close_table");

    if(!schedule_zoom || !clicked_schedule || !overview_table || !overview_table_caption || !close_table) {
        return;
    }

    schedule_zoom.style.display = "flex";

    print_on_table(schedule[number], overview_table);
    overview_table_caption.innerHTML = "Timetable " + (number + 1);
    overview_table_caption.style.fontWeight = "bold";

    close_table.addEventListener("click", function() {
        schedule_zoom.style.display = "none";
    });
    window.addEventListener("keydown", function(event) {
        if(event.key == "Escape") {
            schedule_zoom.style.display = "none";
        }
    });
}

function generate_tables(table_in_table) {
    create_schedule();

    table_in_table.innerHTML = "";
    let not_enough = false;

    const outer_table = document.createElement("table");
    for(let i = 0; i < table_height; ++i) {
        if(not_enough) {
            break;
        }

        const outer_tr = document.createElement("tr");
        for(let j = 0; j < table_width; ++j) {
            if(schedule.length <= overview_start + i * table_width + j) {
                not_enough = true;
                break;
            }

            const outer_td = document.createElement("td");
            const inner_table = document.createElement("table");

            const caption = document.createElement("caption");
            caption.appendChild(document.createTextNode("Timetable " + (overview_start + i * table_width + j + 1)));
            caption.style.fontWeight = "bold";
            inner_table.appendChild(caption);

            for(let k = 0; k < max_hours_per_day; ++k) {
                const inner_tr = document.createElement("tr");
                for(let l = 0; l < days_of_week.size; ++l) {
                    const inner_td = document.createElement("td");
                    inner_tr.appendChild(inner_td);
                }
                inner_table.appendChild(inner_tr);
            }

            inner_table.addEventListener("click", function() {
                print_zoomed_schedule(overview_start + i * table_width + j);
            });

            for(let k = 0; k < max_hours_per_day; ++k) {
                for(let l = 0; l < days_of_week.size; ++l) {
                    if(schedule[overview_start + i * table_width + j][l][k]) {
                        inner_table.rows[k].cells[l].style.backgroundColor = colors.get(course_code_map.get(schedule[overview_start + i * table_width + j][l][k].course_code));
                    }
                    else {
                        inner_table.rows[k].cells[l].style.backgroundColor = "white";
                    }
                }
            }

            outer_td.appendChild(inner_table);
            outer_tr.appendChild(outer_td);
        }
        outer_table.appendChild(outer_tr);
    }
    table_in_table.appendChild(outer_table);
}

function create_course_legend() {
    const courses = JSON.parse(localStorage.getItem("courses"));
    const course_view = document.querySelector(".course_view");
    const color_list = document.createElement("ul");

    for(let i = 0; i < courses.length; ++i) {
        const space_label = document.createElement("label");
        const color_item = document.createElement("li");

        space_label.style.backgroundColor = colors.get(course_code_map.get(courses[i]));
        space_label.style.color = colors.get(course_code_map.get(courses[i]));
        space_label.style.paddingRight = "24%";
        space_label.style.marginRight = "10%";

        color_item.appendChild(space_label);

        color_item.appendChild(document.createTextNode(courses[i]));
        color_item.style.fontWeight = "bold";
        color_list.appendChild(color_item);
    }

    course_view.appendChild(color_list);
}

function multiple_schedules() {
    const table_in_table = document.querySelector(".table_in_table");
    const overview_prev = document.querySelector(".overview_prev");
    const overview_next = document.querySelector(".overview_next");
    
    if(!table_in_table || !overview_prev || !overview_next) {
        return;
    }

    const left_click = function() {
        if(overview_start >= table_height * table_width) {
            overview_start -= table_height * table_width;
            generate_tables(table_in_table);
        }
    }
    const right_click = function() {
        if(overview_start + table_height * table_width <= schedule.length) {
            overview_start += table_height * table_width;
            generate_tables(table_in_table);
        }
        else {
            overview_start = 0;
            generate_tables(table_in_table);
        }
    }

    overview_prev.addEventListener("click", left_click);
    window.addEventListener("keydown", function(event) {
        if(event.key == "ArrowLeft") {
            left_click();
        }
    });
    overview_next.addEventListener("click", right_click);
    window.addEventListener("keydown", function(event) {
        if(event.key == "ArrowRight") {
            right_click();
        }
    });

    create_course_legend();
    generate_tables(table_in_table);
}

async function get_info(course_code) {
    let url = baseUrl + "course?key=" + course_code;

    if(!localStorage.getItem("faculty")) {
        url += "&faculty=" + faculty_list_map.get(faculty_list[0]);
    }
    else {
        const arr = JSON.parse(localStorage.getItem("faculty"));

        for(let i = 0; i < arr.length; ++i) {
            url += "&faculty=" + faculty_list_map.get(arr[i]);
        }
    }

    if(!localStorage.getItem("session")) {
        url += "&session=" + session_list_map.get(session_list[0]) + "&session=" + session_list_map.get(session_list[2]);
    }
    else {
        const arr = JSON.parse(localStorage.getItem("session"));

        for(let i = 0; i < arr.length; ++i) {
            url += "&session=" + session_list_map.get(arr[i]);
        }
    }

    const res = await fetch(url, {
      method: "GET"
    });

    const data = await res.text();
    return data;
}

async function get_info_selected(result) {
    if(!localStorage.getItem("faculty")) {
        result.faculty = new Array(faculty_list_map.get(faculty_list[0]));
    }
    else {
        const arr = JSON.parse(localStorage.getItem("faculty"));
        result.faculty = new Array();

        for(let i = 0; i < arr.length; ++i) {
            result.faculty.push(faculty_list_map.get(arr[i]));
        }
    }

    if(!localStorage.getItem("session")) {
        result.session = new Array(session_list_map.get(session_list[0]));
    }
    else {
        const arr = JSON.parse(localStorage.getItem("session"));
        result.session = new Array();

        for(let i = 0; i < arr.length; ++i) {
            result.session.push(session_list_map.get(arr[i]));
        }
    }

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

function add_course(result, course_code, course_term) {
    const courses = JSON.parse(localStorage.getItem("courses"));
    const searching_load_screen = document.querySelector(".searching_load_screen");

    if(courses && courses.length > 5) {
        searching_load_screen.innerHTML = "Cannot take more than 6 courses";
        return;
    }

    if(!localStorage.getItem("course_term")) {
        localStorage.setItem("course_term", course_term);
    }
    
    if(course_term != localStorage.getItem("course_term") && course_term != "Y") {
        searching_load_screen.innerHTML = "Cannot have both fall and winter term courses";
        return;
    }

    if(!courses || !courses.includes(course_code)) {
        searching_load_screen.innerHTML = "Added " + course_code + " " + course_term + " to list";
        add_course_to_storage(course_code);
        add_course_data_to_storage(result);
        add_new_element(course_code, course_term);
    }
    else {
        searching_load_screen.innerHTML = course_code + " already exists";
    }
}

function find_course(course_code) {
    const course_info = get_info(course_code);
    const loading = document.querySelector(".loading");
    const searching_load_screen = document.querySelector(".searching_load_screen");

    course_info.then(result => {
        // no result found
        if(result.search("not found") != -1) {
            const index = result.search("not found");

            loading.style.display = "flex";
            searching_load_screen.innerHTML = result.substring(0, index) + " not found";
        }
        // multiple results found
        else if(JSON.parse(result)[0].course_name) {
            multiple_searches(JSON.parse(result), course_code);

            return;
        }
        // one result found
        else {
            const course_code = JSON.parse(result)[0].course_code;
            const course_term = JSON.parse(result)[0].course_term;

            if(!localStorage.getItem("course_term")) {
                localStorage.setItem("course_term", course_term);
            }

            if(course_term != localStorage.getItem("course_term") && course_term != "Y") {
                searching_load_screen.innerHTML = "Cannot have both fall and winter term courses";
            }
            else {
                add_course(result, course_code, course_term);
            }
        }

        setTimeout(function() {
            loading.style.display = "none";
            searching_load_screen.innerHTML = "";
        }, 1500);
    });
}

function add_course_to_storage(course_code) {
    if(!localStorage.getItem("courses")) {
        localStorage.setItem("courses", JSON.stringify(new Array()));
    }

    const arr = JSON.parse(localStorage.getItem("courses"));
    arr.push(course_code);
    localStorage.setItem("courses", JSON.stringify(arr));
}

function add_course_data_to_storage(result) {
    if(!localStorage.getItem("course_data")) {
        localStorage.setItem("course_data", JSON.stringify(new Array()));
    }
    const arr = JSON.parse(localStorage.getItem("course_data"));
    arr.push(JSON.parse(result));
    localStorage.setItem("course_data", JSON.stringify(arr));
}

function searched() {
    const search_text = document.querySelector(".search_text");
    const loading = document.querySelector(".loading");
    const searching_load_screen = document.querySelector(".searching_load_screen");

    if(!search_text || !loading || !searching_load_screen) {
        return;
    }

    loading.style.display = "flex";
    searching_load_screen.innerHTML = "Searching for " + search_text.value + "...";

    find_course(search_text.value);

    search_text.value = "";
}

function remove_element(remove, item, course_list) {
    remove.addEventListener("click", function() {
        const courses = JSON.parse(localStorage.getItem("courses"));
        const course_data = JSON.parse(localStorage.getItem("course_data"));
        
        item.removeChild(remove);
        course_list.removeChild(item);

        for(let i = 0; i < courses.length; ++i) {
            if(courses[i] == item.innerHTML.substring(0, item.innerHTML.indexOf(" "))) {
                courses.splice(i, 1);
                course_data.splice(i, 1);
            }
        }
        localStorage.setItem("courses", JSON.stringify(courses));
        localStorage.setItem("course_data", JSON.stringify(course_data));
    });
}

function press_course_list(item) {
    const course_data = sort_course_data(JSON.parse(localStorage.course_data));
    const pop_up = document.querySelector(".pop_up");
    const pop_up_results = document.querySelector(".pop_up_results");
    const course_label_div = document.createElement("div");
    const description_label_div = document.createElement("div");
    const time_label_div = document.createElement("div");
    const course_label = document.createElement("label");
    const description_label = document.createElement("label");
    const close = document.createElement("button");
    const course_code = item.innerHTML.substring(0, item.innerHTML.indexOf(" "));
    let course_description = "";
    let index = -1;


    if(!pop_up || !pop_up_results) {
        return;
    }

    for(let i = 0; i < course_data.length; ++i) {
        if(course_code == course_data[i][0].course_code) {
            course_description = course_data[i][0].course_description;
            index = i;
        }
    }

    if(!course_description) {
        return;
    }

    pop_up.style.display = "flex";

    course_label.appendChild(document.createTextNode(item.innerHTML.substring(0, item.innerHTML.indexOf("<"))));
    course_label.style.fontWeight = "bold";
    course_label.style.fontSize = "30px";
    course_label_div.appendChild(course_label);
    pop_up_results.appendChild(course_label_div);

    description_label.appendChild(document.createTextNode(course_description));
    description_label_div.appendChild(description_label)
    pop_up_results.appendChild(description_label_div);

    close.appendChild(document.createTextNode("X"));
    pop_up_results.appendChild(close);

    for(let i = 0; i < course_data[index].length; ++i) {
        const section = document.createElement("label");
        const time_list = document.createElement("ul");

        section.appendChild(document.createTextNode(course_data[index][i].teach_method + course_data[index][i].section_number));
        section.style.fontWeight = "bold";
        time_label_div.appendChild(section);
        
        for(let j = 0; j < course_data[index][i].time.length; ++j) {
            const time = document.createElement("li");
            time.appendChild(document.createTextNode(course_data[index][i].time[j].day + " " + course_data[index][i].time[j].start_time + " - " + course_data[index][i].time[j].end_time));
            time_list.appendChild(time);
            time_label_div.appendChild(time_list);
        }
        pop_up_results.appendChild(time_label_div);
    }

    window.addEventListener("keydown", function(event) {
        if(event.key == "Escape") {
            pop_up.style.display = "none";
            pop_up_results.innerHTML = "";
        }
    });

    close.addEventListener("click", function() {
        pop_up.style.display = "none";
        pop_up_results.innerHTML = "";
    });
}

function add_new_element(course_name, course_term) {
    const course_list = document.querySelector(".course_list");
    const item = document.createElement("li");
    const remove = document.createElement("span");

    remove_element(remove, item, course_list);

    remove.appendChild(document.createTextNode("X"));
    item.appendChild(document.createTextNode(course_name + " " + course_term));
    item.appendChild(remove);
    course_list.appendChild(item);

    item.addEventListener("click", function(){
        press_course_list(item);
    });
}

function add_previous_elements() {
    const course_list = document.querySelector(".course_list");

    if(!course_list) {
        return;
    }

    const courses = JSON.parse(localStorage.getItem("courses"));
    const course_data = JSON.parse(localStorage.getItem("course_data"));
    const num_of_elements = course_list.childElementCount;

    if(courses && num_of_elements != courses.length) {
        let course_term = "";
        for(let i = 0; i < courses.length; ++i) {
            const course_list = document.querySelector(".course_list");
            const item = document.createElement("li");
            const remove = document.createElement("span");

            for(let j = 0 ; j < course_data.length; ++j) {
                if(course_data[j][0].course_code == courses[i]) {
                    course_term = course_data[j][0].course_term;
                }
            }

            remove_element(remove, item, course_list);
    
            remove.appendChild(document.createTextNode("X"));
            item.appendChild(document.createTextNode(courses[i] + " " + course_term));
            item.appendChild(remove);
            course_list.appendChild(item);

            item.addEventListener("click", function(){
                press_course_list(item);
            });
        }
    }
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

function clear_local_storage() {
    const clear_storage = document.querySelector(".clear_storage");
    const course_list = document.querySelector(".course_list");

    if(!clear_storage || !course_list) {
        return;
    }

    clear_storage.addEventListener("click", function() {
        localStorage.clear();
        course_list.innerHTML = "";
        localStorage.setItem("faculty", JSON.stringify(new Array(
            faculty_list[0],
            faculty_list[1]
        )));
        localStorage.setItem("session", JSON.stringify(new Array(
            session_list[0],
            session_list[2]
        )));
    });
}

function multiple_searches(results, search) {
    const pop_up = document.querySelector(".pop_up");
    const pop_up_results = document.querySelector(".pop_up_results");
    const loading = document.querySelector(".loading");
    const searching_load_screen = document.querySelector(".searching_load_screen");
    const searched = document.createElement("label");
    const close = document.createElement("button");

    if(!pop_up || !pop_up_results || !loading || !searching_load_screen) {
        return;
    }

    pop_up.style.display = "flex";
    loading.style.display = "none";

    searched.appendChild(document.createTextNode("Search results for " + search));
    searched.style.fontWeight = "bold";
    pop_up_results.appendChild(searched);

    close.appendChild(document.createTextNode("X"));
    pop_up_results.appendChild(close);

    window.addEventListener("keydown", function(event) {
        if(event.key == "Escape") {
            pop_up.style.display = "none";
            pop_up_results.innerHTML = "";
        }
    });

    close.addEventListener("click", function() {
        pop_up.style.display = "none";
        pop_up_results.innerHTML = "";
    });

    for(let i = 0; i < results.length; ++i) {
        const item = document.createElement("li");
        item.style.cursor = "pointer";
        
        item.appendChild(document.createTextNode(results[i].course_code + " " + results[i].course_term + ": " + results[i].course_name));
        pop_up_results.appendChild(item);

        item.addEventListener("click", function() {
            const selected_result = get_info_selected(results[i]);
            pop_up.style.display = "none";
            pop_up_results.innerHTML = "";
            loading.style.display = "flex";
            searching_load_screen.innerHTML = "";

            selected_result.then(result => {
                add_course(result, results[i].course_code, results[i].course_term);

                setTimeout(function() {
                    loading.style.display = "none";
                    searching_load_screen.innerHTML = "";
                }, 1500);
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

function add_filter_to_storage(type, element) {
    if(!localStorage.getItem(type)) {
        localStorage.setItem(type, JSON.stringify(new Array()));
    }

    const arr = JSON.parse(localStorage.getItem(type));
    arr.push(element);
    localStorage.setItem(type, JSON.stringify(arr));
}

function remove_filter_from_storage(type, element) {
    if(!localStorage.getItem(type)) {
        return;
    }

    const arr = JSON.parse(localStorage.getItem(type));
    const index = arr.indexOf(element);

    if(index != -1) {
        arr.splice(index, 1);
    }

    localStorage.setItem(type, JSON.stringify(arr));
}

function find_filter_in_storage(type, element) {
    if(!localStorage.getItem(type)) {
        return false;
    }

    const arr = JSON.parse(localStorage.getItem(type));
    const index = arr.indexOf(element);

    if(index != -1) {
        return true;
    }

    return false;
}

function add_exclude_to_storage(type, element) {
    add_filter_to_storage(type, element);
}

function remove_exclude_to_storage(type, element) {
    if(!localStorage.getItem(type)) {
        return;
    }

    const arr = JSON.parse(localStorage.getItem(type));
    let index = -1;

    for(let i = 0; i < arr.length; ++i) {
        if(arr[i].course_code == element.course_code &&
            arr[i].section_number == element.section_number &&
            arr[i].teach_method == element.teach_method) {
            index = i;
        }
    }

    if(index != -1) {
        arr.splice(index, 1);
    }

    localStorage.setItem(type, JSON.stringify(arr));
}

function find_exclude_in_storage(type, element) {
    if(!localStorage.getItem(type)) {
        return false;
    }

    const arr = JSON.parse(localStorage.getItem(type));

    for(let i = 0; i < arr.length; ++i) {
        if(arr[i].course_code == element.course_code &&
            arr[i].section_number == element.section_number &&
            arr[i].teach_method == element.teach_method) {
            return true;
        }
    }

    return false;
}

function sort_course_data(data) {
    const sorted_data = new Array();
    for(let i = 0; i < data.length; ++i) {
        const lec = new Array();
        const tut = new Array();
        const pra = new Array();
        for(let j = 0; j < data[i].length; ++j) {
            if(data[i][j].teach_method == "LEC") {
                lec.push({
                    course_code: data[i][j].course_code,
                    course_description: data[i][j].course_description,
                    course_term: data[i][j].course_term,
                    teach_method: data[i][j].teach_method,
                    section_number: data[i][j].section_number,
                    time: data[i][j].time
                });
            }
            else if(data[i][j].teach_method == "TUT") {
                tut.push({
                    course_code: data[i][j].course_code,
                    course_description: data[i][j].course_description,
                    course_term: data[i][j].course_term,
                    teach_method: data[i][j].teach_method,
                    section_number: data[i][j].section_number,
                    time: data[i][j].time
                });
            }
            else if(data[i][j].teach_method == "PRA") {
                pra.push({
                    course_code: data[i][j].course_code,
                    course_description: data[i][j].course_description,
                    course_term: data[i][j].course_term,
                    teach_method: data[i][j].teach_method,
                    section_number: data[i][j].section_number,
                    time: data[i][j].time
                });
            }
        }
        lec.sort((course1, course2) => course1.section_number - course2.section_number);
        tut.sort((course1, course2) => course1.section_number - course2.section_number);
        pra.sort((course1, course2) => course1.section_number - course2.section_number);
        
        sorted_data[i] = lec.concat(tut, pra);
    }

    return sorted_data;
}

function open_filter() {
    const filter = document.querySelector(".filter");
    const pop_up = document.querySelector(".pop_up");
    const pop_up_results = document.querySelector(".pop_up_results");

    if(!filter || !pop_up || !pop_up_results) {
        return;
    }
    
    filter.addEventListener("click", function() {
        const faculty_label = document.createElement("label");
        const session_label = document.createElement("label");
        const close_filter = document.createElement("button");

        pop_up.style.display = "flex";

        close_filter.appendChild(document.createTextNode("X"));
        pop_up_results.appendChild(close_filter);

        faculty_label.appendChild(document.createTextNode("Faculty"));
        faculty_label.style.fontWeight = "bold";
        pop_up_results.appendChild(faculty_label);

        for(let i = 0; i < faculty_list.length; ++i) {
            const list = document.createElement("li");
            const check_box = document.createElement("input");
            const check_box_label = document.createElement("label");

            check_box.type = "checkbox";
            check_box.checked = find_filter_in_storage("faculty", faculty_list[i]);
            check_box_label.appendChild(check_box);
            check_box_label.appendChild(document.createTextNode(faculty_list[i]));
            list.appendChild(check_box_label);

            pop_up_results.appendChild(list);

            check_box.addEventListener("change", function() {
                if(check_box.checked) {
                    add_filter_to_storage("faculty", faculty_list[i]);
                }
                else {
                    remove_filter_from_storage("faculty", faculty_list[i]);
                }
            });
        }

        session_label.appendChild(document.createTextNode("Session"));
        session_label.style.fontWeight = "bold";
        pop_up_results.appendChild(session_label);

        for(let i = 0; i < session_list.length; ++i) {
            const list = document.createElement("li");
            const check_box = document.createElement("input");
            const check_box_label = document.createElement("label");

            check_box.type = "checkbox";
            check_box.checked = find_filter_in_storage("session", session_list[i]);
            check_box_label.appendChild(check_box);
            check_box_label.appendChild(document.createTextNode(session_list[i]));
            list.appendChild(check_box_label);

            pop_up_results.appendChild(list);

            check_box.addEventListener("change", function() {
                if(check_box.checked) {
                    add_filter_to_storage("session", session_list[i]);
                }
                else {
                    remove_filter_from_storage("session", session_list[i]);
                }
            });
        }

        close_filter.addEventListener("click", function() {
            pop_up.style.display = "none";
            pop_up_results.innerHTML = "";
        });

        window.addEventListener("keydown", function(event) {
            if(event.key == "Escape") {
                pop_up.style.display = "none";
                pop_up_results.innerHTML = "";
            }
        });
    });

    filter.addEventListener("mouseover", function() {
        filter.style.color = "blue";
    });

    filter.addEventListener("mouseout", function() {
        filter.style.color = "black";
    });
}

function open_exclude() {
    const exclude = document.querySelector(".exclude");
    const pop_up = document.querySelector(".pop_up");
    const pop_up_results = document.querySelector(".pop_up_results");

    if(!exclude || !pop_up || !pop_up_results) {
        return;
    }
    
    exclude.addEventListener("click", function() {
        if(!localStorage.getItem("course_data")) {
            return;
        }

        const close_exclude = document.createElement("button");
        const course_data = sort_course_data(JSON.parse(localStorage.course_data));

        pop_up.style.display = "flex";

        close_exclude.appendChild(document.createTextNode("X"));
        pop_up_results.appendChild(close_exclude);

        for(let i = 0; i < course_data.length; ++i) {
            for(let j = 0; j < course_data[i].length; ++j) {
                if(j == 0) {
                    const course_label = document.createElement("label");
                    course_label.style.fontWeight = "bold";
                    course_label.style.marginBottom = "3%";
                    course_label.appendChild(document.createTextNode(course_data[i][j].course_code));
                    pop_up_results.appendChild(course_label);
                }

                const list = document.createElement("li");
                const check_box = document.createElement("input");
                const check_box_label = document.createElement("label");

                check_box.type = "checkbox";
                check_box.checked = !find_exclude_in_storage("exclude", course_data[i][j]);
                check_box_label.style.marginBottom = "3%";
                check_box_label.appendChild(check_box);
                check_box_label.appendChild(document.createTextNode(course_data[i][j].teach_method + course_data[i][j].section_number));
                list.appendChild(check_box_label);

                pop_up_results.appendChild(list);
                check_box.addEventListener("change", function() {
                    if(!check_box.checked) {
                        add_exclude_to_storage("exclude", course_data[i][j]);
                    }
                    else {
                        remove_exclude_to_storage("exclude", course_data[i][j]);
                    }
                });
            }
        }

        close_exclude.addEventListener("click", function() {
            pop_up.style.display = "none";
            pop_up_results.innerHTML = "";
        });
        
        window.addEventListener("keydown", function(event) {
            if(event.key == "Escape") {
                pop_up.style.display = "none";
                pop_up_results.innerHTML = "";
            }
        });
    });

    exclude.addEventListener("mouseover", function() {
        exclude.style.color = "blue";
    });

    exclude.addEventListener("mouseout", function() {
        exclude.style.color = "black";
    });
}

function main() {
    parse_json();
    create_permutations();
    create_schedule();

    multiple_schedules();

    clear_local_storage();
    course_search();
    add_previous_elements();
    schedule_click();
    open_filter();
    open_exclude();
}

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
    [0, "rgb(110, 77, 188)"], // purple
    [1, "rgb(29, 153, 111)"], // green
    [2, "rgb(209,84,31)"], // orange
    [3, "rgb(201,73,145)"], // pink
    [4, "rgb(212,138,52)"], // yellow
    [5, "rgb(173, 216, 250)"], // blue
]);
const faculty_list = [
    "Faculty of Applied Science & Engineering",
    "Faculty of Arts and Science",
    "Faculty of Kinesiology and Physical Education",
    "Faculty of Music",
    "John H. Daniels Faculty of Architecture, Landscape, & Design"
];
const faculty_list_map = new Map([
    [faculty_list[0], "APSC"],
    [faculty_list[1], "ARTSC"],
    [faculty_list[2], "FPEH"],
    [faculty_list[3], "MUSIC"],
    [faculty_list[4], "ARCLA"]
]);
const session_list = [
    "Fall 2023 (F)",
    "Winter 2024 (S)",
    "Fall-Winter 2023-2024 (Y)"
];
const session_list_map = new Map([
    [session_list[0], "20239"],
    [session_list[1], "20241"],
    [session_list[2], "20239-20241"]
]);

const baseUrl = "http://localhost:3000/";

let course_count = 0;
let possibility_count = 0;
let total_permutations = 0;
let overview_start = 0;
const table_height = 2;
const table_width = 7;
const max_hours_per_day = 12;
const all_courses = new Array();
const counter = new Array();
const schedule = new Array();

main();
