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
        if(table_in_table && (schedule.length >= overview_start + table_height * table_width) || last_schedule) {
            break;
        }
        if(check_counter_reached(counter)) {
            last_schedule = true;
        }

        const temp_schedule = new Array();
        let conflict = false;
        let input_count = 0;

        // initilize temporary schedule array with 5 days and 12 hours per day
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
                                const preference_start_time = JSON.parse(localStorage.getItem("start_time"));
                                const preference_end_time = JSON.parse(localStorage.getItem("end_time"));

                                if(time[l].start_time < preference_start_time || time[l].start_time + time[l].duration > preference_end_time) {
                                    conflict = true;
                                }

                                temp_schedule[days_of_week.get(time[l].day)][time[l].start_time - 9 + m] = course;
                                input_count++;
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
        if(!conflict && input_count != 0) {
            schedule.push(temp_schedule);
        }
        // go to the next possible permutation
        add_one(counter);

        if(last_schedule) {
            break;
        }
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

function print_all_schedules() {
    const table = document.querySelector(".table");

    if(!table) {
        return;
    }

    create_schedule();
}

function print_schedule(schedule) {
    const table = document.querySelector(".table");

    if(!table || !schedule) {
        return;
    }

    print_on_table(schedule, table);
}

function print_on_table(schedule, table) {
    let insert_count = 0;

    for(let i = 0; i < schedule.length; ++i) {
        for(let j = 0; j < schedule[i].length; ++j) {
            if(schedule[i][j]) {
                table.rows[j + 1].cells[i + 1].innerHTML = "<b>" + schedule[i][j].course_code + "</b>" + "<br>" + schedule[i][j].section.section_type + schedule[i][j].section.section_num;
                
                if(!colors.get(course_code_map.get(schedule[i][j].course_code))) {
                    course_code_map.set(schedule[i][j].course_code, course_code_map.size);
                    insert_count++;
                }

                table.rows[j + 1].cells[i + 1].style.backgroundColor = colors.get(course_code_map.get(schedule[i][j].course_code));
            }
            else {
                table.rows[j + 1].cells[i + 1].innerHTML = "";
                table.rows[j + 1].cells[i + 1].style.backgroundColor = "white";
            }
        }
    }

    const initial_length = course_code_map.size;
    for(let [key, value] of course_code_map.entries()) {
        for(let i = 0; i < insert_count; ++i) {
            if(value == initial_length - i) {
                course_code_map.delete(key);
            }
        }
    }
}

function print_blank_table(table, caption) {
    for(let i = 0; i < days_of_week.size; ++i) {
        for(let j = 0; j < max_hours_per_day; ++j) {
            table.rows[j + 1].cells[i + 1].innerHTML = "";
            table.rows[j + 1].cells[i + 1].style.backgroundColor = "white";
        }
    }
    caption.innerHTML = "No saved timetables";
}

function next_schedule(caption) {
    if(!caption) {
        return;
    }

    const saved_icon = document.querySelector(".saved_icon");
    const saved = JSON.parse(localStorage.getItem("saved"));

    if(schedule.length == 0) {
        caption.innerHTML = "No possible timetables";
        return;
    }

    possibility_count++;
    if(possibility_count % (schedule.length + 1) == 0) {
        possibility_count++;
    }

    print_schedule(schedule[possibility_count % (schedule.length + 1) - 1]);
    caption.innerHTML = "Timetable " + (possibility_count % (schedule.length + 1)) + "/" + schedule.length;

    if(saved) {
        if(check_saved_exists(saved, schedule[possibility_count % (schedule.length + 1) - 1]) != -1) {
            saved_icon.setAttribute("src", "./icons/saved.png");
        }
        else {
            saved_icon.setAttribute("src", "./icons/not_saved.png");
        }
    }
}

function previous_schedule(caption) {
    if(!caption) {
        return;
    }

    const saved_icon = document.querySelector(".saved_icon");
    const saved = JSON.parse(localStorage.getItem("saved"));

    if(schedule.length == 0) {
        caption.innerHTML = "No possible timetables";
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
    caption.innerHTML = "Timetable " + (possibility_count % (schedule.length + 1)) + "/" + schedule.length;

    if(check_saved_exists(saved, schedule[possibility_count % (schedule.length + 1) - 1]) != -1) {
        saved_icon.setAttribute("src", "./icons/saved.png");
    }
    else {
        saved_icon.setAttribute("src", "./icons/not_saved.png");
    }
}

function check_saved_exists(saved_schedules, current_schedule) {
    if(!current_schedule || !saved_schedules) {
        return -1;
    }

    if(saved_schedules.length == 0) {
        return -1;
    }
    for(let i = 0; i < saved_schedules.length; ++i) {
        let match = true;
        for(let j = 0; j < saved_schedules[i].length; ++j) {
            for(let k = 0; k < saved_schedules[i][j].length; ++k) {
                if(saved_schedules[i][j][k] && current_schedule[j][k]) {
                    if(saved_schedules[i][j][k].course_code != current_schedule[j][k].course_code ||
                        saved_schedules[i][j][k].section.section_type != current_schedule[j][k].section.section_type ||
                        saved_schedules[i][j][k].section.section_num != current_schedule[j][k].section.section_num) {
                        match = false;
                    }
                }
                else if(saved_schedules[i][j][k] && !current_schedule[j][k] || !saved_schedules[i][j][k] && current_schedule[j][k]) {
                    match = false;
                }
            }
        }
        if(match) {
            return i;
        }
        else if(!match && i == saved_schedules.length - 1) {
            return -1;
        }
    }
}

function save_button_pressed(current_schedule) {
    if(!localStorage.getItem("saved")) {
        localStorage.setItem("saved", JSON.stringify(new Array()));
    }

    const saved = JSON.parse(localStorage.getItem("saved"));
    const saved_icon = document.querySelector(".saved_icon");
    const save_index = check_saved_exists(saved, current_schedule);

    if(save_index == -1) {
        saved.push(current_schedule);
        saved_icon.setAttribute("src", "./icons/saved.png");
    }
    else {
        saved.splice(save_index, 1);
        saved_icon.setAttribute("src", "./icons/not_saved.png");
    }
    localStorage.setItem("saved", JSON.stringify(saved));
}

function schedule_click() {
    const next_button = document.querySelector(".next_course");
    const prev_button = document.querySelector(".previous_course");
    const save_button = document.querySelector(".save_button");
    const caption = document.querySelector(".table_caption");

    next_schedule(caption);

    if(!next_button || !prev_button || !save_button || !caption) {
        return;
    }

    save_button.addEventListener("click", function() {
        const index = possibility_count % (schedule.length + 1) - 1;
        save_button_pressed(schedule[index], index);
    });
    save_button.addEventListener("mouseover", function(){
        save_button.style.backgroundColor = button_on_color;
    });
    save_button.addEventListener("mouseout", function(){
        save_button.style.backgroundColor = button_background_color;
    });

    next_button.addEventListener("click", function() {
        next_schedule(caption);
    });
    window.addEventListener("keydown", function(event) {
        if(event.key == "ArrowRight") {
            next_schedule(caption);
        }
    });
    next_button.addEventListener("mouseover", function(){
        next_button.style.backgroundColor = button_on_color;
    });
    next_button.addEventListener("mouseout", function(){
        next_button.style.backgroundColor = button_background_color;
    });

    prev_button.addEventListener("click", function() {
        previous_schedule(caption);
    });
    window.addEventListener("keydown", function(event) {
        if(event.key == "ArrowLeft") {
            previous_schedule(caption);
        }
    });
    prev_button.addEventListener("mouseover", function(){
        prev_button.style.backgroundColor = button_on_color;
    });
    prev_button.addEventListener("mouseout", function(){
        prev_button.style.backgroundColor = button_background_color;
    });
}

function next_saved_schedule(saved_schedules, saved_table_caption, saved_table) {
    if(!saved_table_caption) {
        return;
    }

    saved_count++;
    if(saved_count % (saved_schedules.length + 1) == 0) {
        saved_count++;
    }

    print_on_table(saved_schedules[saved_count % (saved_schedules.length + 1) - 1], saved_table);
    saved_table_caption.innerHTML = "Timetable " + (saved_count % (saved_schedules.length + 1)) + "/" + saved_schedules.length;
}

function previous_saved_schedule(saved_schedules, saved_table_caption, saved_table) {
    if(!saved_table_caption) {
        return;
    }

    saved_count--;
    if(saved_count % (saved_schedules.length + 1) == 0) {
        saved_count--;
    }
    if(saved_count % (saved_schedules.length + 1) < 0) {
        saved_count += saved_schedules.length + 1;
    }

    print_on_table(saved_schedules[saved_count % (saved_schedules.length + 1) - 1], saved_table);
    saved_table_caption.innerHTML = "Timetable " + (saved_count % (saved_schedules.length + 1)) + "/" + saved_schedules.length;
}

function delete_from_saved(saved_schedules, saved_table, saved_table_caption, index) {
    saved_schedules.splice(index, 1);
    localStorage.setItem("saved", JSON.stringify(saved_schedules));

    if(saved_schedules.length == 0) {
        print_blank_table(saved_table, saved_table_caption);

        return;
    }

    if(index == saved_schedules.length) {
        saved_count = 1;
    }

    saved_table_caption.innerHTML = "Timetable " + saved_count % (saved_schedules.length + 1) + "/" + saved_schedules.length;
    print_on_table(saved_schedules[index % saved_schedules.length], saved_table);
}

function print_saved_schedules() {
    const saved_table = document.querySelector(".saved_table");
    const saved_table_caption = document.querySelector(".saved_table_caption");
    const saved_previous_course = document.querySelector(".saved_previous_course");
    const saved_next_course = document.querySelector(".saved_next_course");
    const delete_saved_course = document.querySelector(".delete_saved_course");

    if(!saved_table || !saved_table_caption || !saved_previous_course || !saved_next_course || !delete_saved_course || !localStorage.getItem("saved")) {
        return;
    }

    const saved_schedules = JSON.parse(localStorage.getItem("saved"));

    if(saved_schedules.length == 0) {
        return;
    }

    next_saved_schedule(saved_schedules, saved_table_caption, saved_table);

    saved_next_course.addEventListener("click", function() {
        next_saved_schedule(saved_schedules, saved_table_caption, saved_table);
    });
    window.addEventListener("keydown", function(event) {
        if(event.key == "ArrowRight") {
            next_saved_schedule(saved_schedules, saved_table_caption, saved_table);
        }
    });
    saved_next_course.addEventListener("mouseover", function(){
        saved_next_course.style.backgroundColor = button_on_color;
    });
    saved_next_course.addEventListener("mouseout", function(){
        saved_next_course.style.backgroundColor = button_background_color;
    });

    saved_previous_course.addEventListener("click", function() {
        previous_saved_schedule(saved_schedules, saved_table_caption, saved_table);
    });
    window.addEventListener("keydown", function(event) {
        if(event.key == "ArrowLeft") {
            previous_saved_schedule(saved_schedules, saved_table_caption, saved_table);
        }
    });
    saved_previous_course.addEventListener("mouseover", function(){
        saved_previous_course.style.backgroundColor = button_on_color;
    });
    saved_previous_course.addEventListener("mouseout", function(){
        saved_previous_course.style.backgroundColor = button_background_color;
    });

    delete_saved_course.addEventListener("click", function() {
        delete_from_saved(saved_schedules, saved_table, saved_table_caption, saved_count % (saved_schedules.length + 1) - 1);
    });
    delete_saved_course.addEventListener("mouseover", function(){
        delete_saved_course.style.backgroundColor = button_on_color;
    });
    delete_saved_course.addEventListener("mouseout", function(){
        delete_saved_course.style.backgroundColor = button_background_color;
    });
}

function print_zoomed_schedule(number) {
    const schedule_zoom = document.querySelector(".schedule_zoom");
    const clicked_schedule = document.querySelector(".clicked_schedule");
    const overview_table = document.querySelector(".overview_table");
    const overview_table_caption = document.querySelector(".overview_table_caption");
    const close_table = document.querySelector(".close_table");
    const saved_icon = document.querySelector(".saved_icon");
    const saved = JSON.parse(localStorage.getItem("saved"));

    if(!schedule_zoom || !clicked_schedule || !overview_table || !overview_table_caption || !close_table || !saved_icon) {
        return;
    }

    if(saved) {
        if(check_saved_exists(saved, schedule[number]) != -1) {
            saved_icon.setAttribute("src", "./icons/saved.png");
        }
        else {
            saved_icon.setAttribute("src", "./icons/not_saved.png");
        }
    }


    schedule_zoom.style.display = "flex";

    print_on_table(schedule[number], overview_table);
    overview_table_caption.innerHTML = "Timetable " + (number + 1);

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

    if(!courses) {
        return;
    }

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
    const overview_save_button = document.querySelector(".overview_save_button");
    const overview_table_caption = document.querySelector(".overview_table_caption");
    const course_view = document.querySelector(".course_view");
    
    if(!table_in_table || !overview_prev || !overview_next || !overview_save_button || !overview_table_caption || !course_view) {
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

            if(table_in_table.innerHTML.includes("<tr></tr>")) {
                overview_start = 0;
                generate_tables(table_in_table);
            }
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

    overview_prev.addEventListener("mouseover", function(){
        overview_prev.style.backgroundColor = button_on_color;
    });
    overview_prev.addEventListener("mouseout", function(){
        overview_prev.style.backgroundColor = button_background_color;
    });

    overview_next.addEventListener("mouseover", function(){
        overview_next.style.backgroundColor = button_on_color;
    });
    overview_next.addEventListener("mouseout", function(){
        overview_next.style.backgroundColor = button_background_color;
    });

    overview_save_button.addEventListener("click", function() {
        const caption = overview_table_caption.innerHTML;
        const index = caption.substring((caption.indexOf(" ") + 1), caption.length) - 1;
        save_button_pressed(schedule[index], index);
    });
    overview_save_button.addEventListener("mouseover", function(){
        overview_save_button.style.backgroundColor = button_on_color;
    });
    overview_save_button.addEventListener("mouseout", function(){
        overview_save_button.style.backgroundColor = button_background_color;
    });

    create_course_legend();
    generate_tables(table_in_table);

    if(schedule.length == 0) {
        overview_prev.style.visibility = "hidden";
        overview_next.style.visibility = "hidden";
        course_view.style.visibility = "hidden";
    }
    else {
        overview_prev.style.visibility = "visible";
        overview_next.style.visibility = "visible";
        course_view.style.visibility = "visible";
    }
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
    const search_text = document.querySelector(".search_text");

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
            search_text.removeAttribute("disabled");
            search_text.focus();
        }, 1000);
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

    search_text.setAttribute("disabled", "disabled");
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

        if(courses.length == 0) {
            if(localStorage.getItem("course_term")) {
                localStorage.removeItem("course_term");
            }
        }
    });
}

function parse_description(description) {
    for(let i = 0; i < description.length; ++i) {
        if(description[i] == "." && i != description.length - 1) {
            const left = description.substring(0, i + 2);
            const right = description.substring(i + 3);
            description = left + description[i + 2].toUpperCase() + right;
        }
    }

    description = description[0].toUpperCase() + description.substring(1, description.length);

    return description;
}

function press_course_list(item) {
    const course_data = sort_course_data(JSON.parse(localStorage.course_data));
    const pop_up = document.querySelector(".pop_up");
    const pop_up_results = document.querySelector(".pop_up_results");
    const course_label_div = document.createElement("div");
    const description_label_div = document.createElement("div");
    const course_info_div = document.createElement("div");
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
    else {
        course_description = parse_description(course_description);
    }

    pop_up.style.display = "flex";
    pop_up_results.style.width = "70%";
    pop_up_results.style.height = "60%";

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
        const table = document.createElement("table");
        const info_num = 4;

        table.style.border = "2px solid black";

        section.appendChild(document.createTextNode(course_data[index][i].teach_method + course_data[index][i].section_number));
        section.style.fontWeight = "bold";
        section.style.fontSize = "20px";
        course_info_div.appendChild(section);
        
        const tr_head = document.createElement("tr");
        const tr_body = document.createElement("tr");

        for(let j = 0; j < info_num; ++j) {
            const th = document.createElement("th");
            th.appendChild(document.createTextNode(description_table_list[j]));
            tr_head.appendChild(th);
        }

        const time_list = document.createElement("ul");
        const time_td = document.createElement("td");
        for(let j = 0; j < course_data[index][i].time.length; ++j) {
            const time = document.createElement("li");
            time.appendChild(document.createTextNode(course_data[index][i].time[j].day + " " + convert_am_pm(course_data[index][i].time[j].start_time) + " - " + convert_am_pm(course_data[index][i].time[j].end_time)));
            time_list.appendChild(time);
        }
        time_td.appendChild(time_list);
        tr_body.appendChild(time_td);

        const building_list = document.createElement("ul");
        const building_td = document.createElement("td");
        for(let j = 0; j < course_data[index][i].building.length; ++j) {
            const building = document.createElement("li");
            building.appendChild(document.createTextNode(course_data[index][i].building[j]));
            building_list.appendChild(building);
        }
        building_td.appendChild(building_list);
        tr_body.appendChild(building_td);

        const instructor_list = document.createElement("ul");
        const instructor_td = document.createElement("td");
        for(let j = 0; j < course_data[index][i].instructor.length; ++j) {
            const instructor = document.createElement("li");
            instructor.appendChild(document.createTextNode(course_data[index][i].instructor[j]));
            instructor_list.appendChild(instructor);
        }
        if(course_data[index][i].instructor.length == 0) {
            const instructor = document.createElement("li");
            instructor.appendChild(document.createTextNode("TBA"));
            instructor_list.appendChild(instructor);
        }
        instructor_td.appendChild(instructor_list);
        tr_body.appendChild(instructor_td);

        const space_list = document.createElement("ul");
        const space_td = document.createElement("td");
        const space = document.createElement("li");

        const waitlist_num = JSON.parse(course_data[index][i].waitlist);
        const current_enrolment_num = JSON.parse(course_data[index][i].current_enrolment);
        const max_enrolment_num = JSON.parse(course_data[index][i].max_enrolment);

        if(current_enrolment_num == max_enrolment_num) {
            if(waitlist_num == 0) {
                space.appendChild(document.createTextNode("Section Full"));
                space_list.appendChild(space);
            }
            else {
                const waitlist = document.createElement("li");
                space.appendChild(document.createTextNode("Section Full"));
                waitlist.appendChild(document.createTextNode("Waitlist: " + waitlist_num));
                space_list.appendChild(space);
                space_list.appendChild(waitlist);
            }
        }
        else {
            space.appendChild(document.createTextNode((max_enrolment_num - current_enrolment_num) + " of " + max_enrolment_num + " available"));
            space_list.appendChild(space);
        }
        space_td.appendChild(space_list);
        tr_body.appendChild(space_td);

        table.appendChild(tr_head);
        table.appendChild(tr_body);
        course_info_div.appendChild(table);
        pop_up_results.appendChild(course_info_div);
    }

    window.addEventListener("keydown", function(event) {
        if(event.key == "Escape") {
            pop_up.style.display = "none";
            pop_up_results.innerHTML = "";
            pop_up_results.style.width = "50%";
            pop_up_results.style.height = "40%";
        }
    });

    close.addEventListener("click", function() {
        pop_up.style.display = "none";
        pop_up_results.innerHTML = "";
        pop_up_results.style.width = "50%";
        pop_up_results.style.height = "40%";
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
        localStorage.setItem("start_time", 9);
        localStorage.setItem("end_time", 21);
    });
}

function multiple_searches(results, search) {
    const pop_up = document.querySelector(".pop_up");
    const pop_up_results = document.querySelector(".pop_up_results");
    const loading = document.querySelector(".loading");
    const searching_load_screen = document.querySelector(".searching_load_screen");
    const search_text = document.querySelector(".search_text");
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
            search_text.removeAttribute("disabled");
            search_text.focus();
        }
    });

    close.addEventListener("click", function() {
        pop_up.style.display = "none";
        pop_up_results.innerHTML = "";
        search_text.removeAttribute("disabled");
        search_text.focus();
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
                    search_text.removeAttribute("disabled");
                    search_text.focus();
                }, 1000);
            });

        });

        item.addEventListener("mouseover", function(){
            item.style.color = button_on_color;
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
                    time: data[i][j].time,
                    waitlist: data[i][j].waitlist,
                    current_enrolment: data[i][j].current_enrolment,
                    max_enrolment: data[i][j].max_enrolment,
                    building: data[i][j].building,
                    instructor: data[i][j].instructor
                });
            }
            else if(data[i][j].teach_method == "TUT") {
                tut.push({
                    course_code: data[i][j].course_code,
                    course_description: data[i][j].course_description,
                    course_term: data[i][j].course_term,
                    teach_method: data[i][j].teach_method,
                    section_number: data[i][j].section_number,
                    time: data[i][j].time,
                    waitlist: data[i][j].waitlist,
                    current_enrolment: data[i][j].current_enrolment,
                    max_enrolment: data[i][j].max_enrolment,
                    building: data[i][j].building,
                    instructor: data[i][j].instructor
                });
            }
            else if(data[i][j].teach_method == "PRA") {
                pra.push({
                    course_code: data[i][j].course_code,
                    course_description: data[i][j].course_description,
                    course_term: data[i][j].course_term,
                    teach_method: data[i][j].teach_method,
                    section_number: data[i][j].section_number,
                    time: data[i][j].time,
                    waitlist: data[i][j].waitlist,
                    current_enrolment: data[i][j].current_enrolment,
                    max_enrolment: data[i][j].max_enrolment,
                    building: data[i][j].building,
                    instructor: data[i][j].instructor
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
        filter.style.color = button_on_color;
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
        if(!localStorage.getItem("course_data") || JSON.parse(localStorage.getItem("course_data")).length == 0) {
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

                if(JSON.parse(course_data[i][j].waitlist) == 0 && JSON.parse(course_data[i][j].current_enrolment == course_data[i][j].max_enrolment)) {
                    check_box_label.appendChild(document.createTextNode(course_data[i][j].teach_method + course_data[i][j].section_number + " → Section Full"));
                }
                else if(JSON.parse(course_data[i][j].waitlist) != 0) {
                    check_box_label.appendChild(document.createTextNode(course_data[i][j].teach_method + course_data[i][j].section_number + " → Waitlist: " + course_data[i][j].waitlist));
                }
                else {
                    check_box_label.appendChild(document.createTextNode(course_data[i][j].teach_method + course_data[i][j].section_number));
                }
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
        exclude.style.color = button_on_color;
    });

    exclude.addEventListener("mouseout", function() {
        exclude.style.color = "black";
    });
}

function convert_am_pm(time) {
    if(parseInt(time) < 12) {
        return time + "am";
    }
    else if(parseInt(time) == 12) {
        return time + "pm";
    }
    else {
        return (parseInt(time) - 12) + "pm";
    }
}

function open_preference() {
    const preference = document.querySelector(".preference");
    const pop_up = document.querySelector(".pop_up");
    const pop_up_results = document.querySelector(".pop_up_results");

    if(!preference || !pop_up || !pop_up_results) {
        return;
    }
    
    preference.addEventListener("click", function() {
        const close_preference = document.createElement("button");

        pop_up.style.display = "flex";

        close_preference.appendChild(document.createTextNode("X"));
        pop_up_results.appendChild(close_preference);

        const start_label = document.createElement("label");
        const start_time_slider = document.createElement("input");
        const start_time_label = document.createElement("label");
        const start_div = document.createElement("div");

        start_label.style.fontWeight = "bold";
        start_label.style.marginRight = "20%";

        start_time_slider.type = "range";
        start_time_slider.min = 9;
        start_time_slider.max = 20;
        start_time_slider.value = JSON.parse(localStorage.getItem("start_time"));

        start_time_label.style.marginLeft = "2%";

        start_label.appendChild(document.createTextNode(preference_list[0]));
        start_time_label.appendChild(document.createTextNode(convert_am_pm(start_time_slider.value)));
        start_div.appendChild(start_label);
        start_div.appendChild(start_time_slider);
        start_div.appendChild(start_time_label);
        pop_up_results.appendChild(start_div);

        const end_label = document.createElement("label");
        const end_time_slider = document.createElement("input");
        const end_time_label = document.createElement("label");
        const end_div = document.createElement("div");

        end_label.style.fontWeight = "bold";
        end_label.style.marginRight = "22.6%";

        end_time_slider.type = "range";
        end_time_slider.min = 10;
        end_time_slider.max = 21;
        end_time_slider.value = JSON.parse(localStorage.getItem("end_time"));

        end_time_label.style.marginLeft = "2%";

        end_label.appendChild(document.createTextNode(preference_list[1]));
        end_time_label.appendChild(document.createTextNode(convert_am_pm(end_time_slider.value)));
        end_div.appendChild(end_label);
        end_div.appendChild(end_time_slider);
        end_div.appendChild(end_time_label);
        pop_up_results.appendChild(end_div);




        start_time_slider.addEventListener("change", function() {
            start_time_label.innerHTML = convert_am_pm(start_time_slider.value);

            if(parseInt(end_time_slider.value) < parseInt(start_time_slider.value)) {
                end_time_slider.value = start_time_slider.value;
                end_time_label.innerHTML = convert_am_pm(end_time_slider.value);

                localStorage.setItem("end_time", end_time_slider.value);
            }
            localStorage.setItem("start_time", start_time_slider.value);
        });

        end_time_slider.addEventListener("change", function() {
            end_time_label.innerHTML = convert_am_pm(end_time_slider.value);

            if(parseInt(end_time_slider.value) < parseInt(start_time_slider.value)) {
                start_time_slider.value = end_time_slider.value;
                start_time_label.innerHTML = convert_am_pm(start_time_slider.value);

                localStorage.setItem("start_time", start_time_slider.value);
            }
            localStorage.setItem("end_time", end_time_slider.value);
        });

        close_preference.addEventListener("click", function() {
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

    preference.addEventListener("mouseover", function() {
        preference.style.color = button_on_color;
    });

    preference.addEventListener("mouseout", function() {
        preference.style.color = "black";
    });
}

function main() {
    parse_json();
    create_permutations();

    print_all_schedules();
    print_saved_schedules();
    multiple_schedules();

    clear_local_storage();
    course_search();
    add_previous_elements();
    schedule_click();
    open_filter();
    open_exclude();
    open_preference();
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
const preference_list = [
    "Start Time",
    "End Time"
]
const description_table_list = [
    "Time",
    "Location",
    "Instructor",
    "Space Availability"
];

const baseUrl = "http://localhost:3000/";

let course_count = 0;
let possibility_count = 0;
let saved_count = 0;
let total_permutations = 0;
let overview_start = 0;
let last_schedule = false;
const table_height = 2;
const table_width = 7;
const max_hours_per_day = 12;
const all_courses = new Array();
const counter = new Array();
const schedule = new Array();

const button_background_color = "darkgray";
const button_on_color = "lightblue";

main();
