// class that has course code and another class: section
class Course {
    constructor(course_code, section) {
        this.course_code = course_code;
        this.section = section;
    }
};

// class that has section type, section num and an array of section times
class Section {
    constructor(section_type, section_num, section_times) {
        this.section_type = section_type;
        this.section_num = section_num;
        this.section_times = this.parse_time(section_times);
    }

    // parse section times into an array of objects
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

// class that has day, start time, end time and duration of each course
class Time {
    constructor(day, start_time, end_time, duration) {
        this.day = day
        this.start_time = start_time
        this.end_time = end_time
        this.duration = duration
    }
};

// class that counts the current section type
class LimitNode {
    constructor(limit) {
        this.count = 0;
        this.limit = limit;
    }
};

// given the course data, parse it using the classes defined above
function parse_json() {
    const course_data = JSON.parse(localStorage.getItem("course_data"));
    const exclude = JSON.parse(localStorage.getItem("exclude"));
    
    if(!course_data) {
        return;
    }

    // loop through the course data
    for(let i = 0; i < course_data.length; ++i) {
        for(let j = 0; j < course_data[i].length; ++j) {
            const code = course_data[i][j].course_code;
            const type = course_data[i][j].teach_method;
            const num = course_data[i][j].section_number;
            const time = course_data[i][j].time;

            // if the course has not been added
            if(!course_code_map.has(code)) {
                all_courses[course_count] = new Array();
                all_courses[course_count][course_section_map.get("LEC")] = new Array();
                all_courses[course_count][course_section_map.get("TUT")] = new Array();
                all_courses[course_count][course_section_map.get("PRA")] = new Array();

                course_code_map.set(code, course_count);
                course_count++;
            }

            // if the user specified to exclude a certain course section
            let remove = false;
            if(exclude) {
                for(let k = 0; k < exclude.length; ++k) {
                    if(exclude[k].course_code == code && exclude[k].teach_method == type && exclude[k].section_number == num) {
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

// create limit nodes
function create_permutations() {
    // loop through all courses
    for(let i = 0; i < all_courses.length; ++i) {
        for(let j = 0; j < all_courses[i].length; ++j) {
            // get the number of sections for each course
            counter.push(new LimitNode(all_courses[i][j].length));
        }
    }
}

// create the schedule
function create_schedule() {
    const next_button = document.querySelector(".next_course");
    const prev_button = document.querySelector(".previous_course");
    const table_in_table = document.querySelector(".table_in_table");

    // if course list is empty then do not create schedule
    if((!next_button || !prev_button || all_courses.length == 0) && !table_in_table) {
        return;
    }
    
    // calculate the number of total permutations
    total_permutations = permutations();
    
    // loop through all permutations
    for(let i = 0; i < total_permutations; ++i) {
        // if the overview schedule page is open and the last schedule is currently being displayed
        if(table_in_table && (schedule.length >= overview_start + table_height * table_width) || last_schedule) {
            break;
        }
        // if all permutations were looped through
        if(check_counter_reached()) {
            last_schedule = true;
        }

        const temp_schedule = new Array();
        let conflict = false;
        let input_count = 0;

        // initilize temporary schedule array with 5 days and 12 hours per day
        for(let j = 0; j < days_of_week_map.size; ++j) {
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
                            if(!temp_schedule[days_of_week_map.get(time[l].day)][time[l].start_time - first_hour + m]) {
                                const preference_start_time = JSON.parse(localStorage.getItem("start_time"));
                                const preference_end_time = JSON.parse(localStorage.getItem("end_time"));

                                // if the user defined a preferred time
                                if(time[l].start_time < preference_start_time || time[l].start_time + time[l].duration > preference_end_time) {
                                    conflict = true;
                                }

                                temp_schedule[days_of_week_map.get(time[l].day)][time[l].start_time - first_hour + m] = course;
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
        add_one();

        // if its the last schedule then break
        if(last_schedule) {
            break;
        }
    }
}

// check if the counter has gone through all permutations
function check_counter_reached() {
    for(let i = 0; i < counter.length; ++i) {
        if(counter[i].limit != 0 && counter[i].count != counter[i].limit - 1) {
            return false;
        }
    }
    return true;
}

// add one to the counter
function add_one() {
    for(let i = counter.length - 1; i >= 0; --i) {
        if(counter[i].count < counter[i].limit - 1) {
            counter[i].count++;
            reset_after(i + 1);
            break;
        }
    }
}

// reset all the indexes before index
function reset_after(index) {
    for(let i = index; i < counter.length; ++i) {
        counter[i].count = 0;
    }
}

// calculate the total permutations
function permutations() {
    let total = 1;
    for(let i = 0; i < counter.length; ++i) {
        if(counter[i].limit != 0) {
            total *= counter[i].limit;
        }
    }
    return total;
}

// print the schedule on the generate schedule page
function print_all_schedules() {
    const table = document.querySelector(".table");
    const table_caption = document.querySelector(".table_caption");

    if(!table || !table_caption) {
        return;
    }
    
    // create the schedule
    create_schedule();

    // if the schedule is not possible display an error message
    if(schedule.length == 0) {
        print_blank_table(table, table_caption, "No possible timetables");
        return;
    }
}

// print the schedule on the table
function print_schedule(current_schedule) {
    const table = document.querySelector(".table");

    if(!table || !current_schedule) {
        return;
    }

    print_on_table(current_schedule, table);
}

// remove the previous table then add a new table
function print_on_table(current_schedule, table) {
    remove_previous_table(table);
    create_table(current_schedule, table);
}

// print an empty table
function print_blank_table(table, caption, caption_text) {
    const current_schedule = new Array(days_of_week_map.size);
    for(let i = 0; i < current_schedule.length; ++i) {
        current_schedule[i] = new Array(max_hours_per_day);
    }
    print_on_table(current_schedule, table);
    caption.innerHTML = caption_text;
}

// removes the previously created table except for the table caption
function remove_previous_table(table) {
    const caption = table.querySelector("caption");
    table.innerHTML = "";
    table.appendChild(caption);
}

// create a new table that is customized from the schedule
function create_table(current_schedule, table) {
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    let insert_count = 0;

    // add the days of week to the table header
    const tr_head = document.createElement("tr");
    for(let i = 0; i < days_of_week_map.size + 1; ++i) {
        const th = document.createElement("th");
        if(i != 0) {
            th.appendChild(document.createTextNode(days_of_week_list[i - 1]));
        }
        tr_head.appendChild(th);
    }
    thead.appendChild(tr_head);

    for(let i = 0; i < max_hours_per_day; ++i) {
        const tr_body = document.createElement("tr");

        for(let j = 0; j < days_of_week_map.size + 1; ++j) {
            // add the time as a table header on the left
            if(j == 0) {
                const th = document.createElement("th");
                th.appendChild(document.createTextNode(convert_am_pm(i + first_hour) + " - " + convert_am_pm(i + first_hour + 1)));
                tr_body.appendChild(th);
            }
            else {
                // if there is a course at the time period
                if(current_schedule[j - 1][i]) {
                    for(let k = 0; k < current_schedule[j-1][i].section.section_times.length; ++k) {
                        const times = current_schedule[j - 1][i].section.section_times[k];

                        // only add the course at when the course starts
                        if(times.day == days_of_week_list[j - 1] && times.start_time == i + first_hour) {
                            // create a table data and span it for the duration of the course
                            const td = document.createElement("td");
                            td.rowSpan = times.duration;
                            td.innerHTML += "<b>" + current_schedule[j - 1][i].course_code + "</b>" + "<br>" + current_schedule[j - 1][i].section.section_type + current_schedule[j - 1][i].section.section_num;
                            
                            // if the course is not found in the course code
                            if(!colors.get(course_code_map.get(current_schedule[j - 1][i].course_code))) {
                                course_code_map.set(current_schedule[j - 1][i].course_code, course_code_map.size);
                                insert_count++;
                            }
                            
                            // add the color to the course
                            td.style.backgroundColor = colors.get(course_code_map.get(current_schedule[j - 1][i].course_code));
                            tr_body.appendChild(td);
                        }
                    }
                }
                // if there are no courses at the time period
                else {
                    const td = document.createElement("td");
                    td.innerHTML = "";
                    td.style.backgroundColor = "white";
                    tr_body.appendChild(td);
                }
            }
        }
        tbody.appendChild(tr_body);
    }

    // append the table head and body to the table
    table.appendChild(thead);
    table.appendChild(tbody);

    // remove the temporary added courses for coloring
    const initial_length = course_code_map.size;
    for(let [key, value] of course_code_map.entries()) {
        for(let i = 0; i < insert_count; ++i) {
            if(value == initial_length - i) {
                course_code_map.delete(key);
            }
        }
    }
}

// when the next schedule button is clicked
function next_schedule(caption) {
    if(!caption) {
        return;
    }

    const saved_icon = document.querySelector(".saved_icon");
    const saved = JSON.parse(localStorage.getItem("saved"));

    // if the schedule length is 0
    if(schedule.length == 0) {
        caption.innerHTML = "No possible timetables";
        return;
    }

    // add 1 to the possibility count to display the next schedule
    possibility_count++;
    if(possibility_count % (schedule.length + 1) == 0) {
        possibility_count++;
    }

    // print the schedule with the caption
    print_schedule(schedule[possibility_count % (schedule.length + 1) - 1]);
    caption.innerHTML = "Timetable " + (possibility_count % (schedule.length + 1)) + "/" + schedule.length;

    // if the schedule was saved change the icon
    if(saved) {
        if(check_saved_exists(saved, schedule[possibility_count % (schedule.length + 1) - 1]) != -1) {
            saved_icon.setAttribute("src", "./icons/saved.png");
        }
        else {
            saved_icon.setAttribute("src", "./icons/not_saved.png");
        }
    }
}

// when the previous schedule button is clicked
function previous_schedule(caption) {
    if(!caption) {
        return;
    }

    const saved_icon = document.querySelector(".saved_icon");
    const saved = JSON.parse(localStorage.getItem("saved"));

    // if the schedule length is 0
    if(schedule.length == 0) {
        caption.innerHTML = "No possible timetables";
        return;
    }

    // subtract 1 to the possibility count to display the next schedule
    possibility_count--;
    if(possibility_count % (schedule.length + 1) == 0) {
        possibility_count--;
    }
    if(possibility_count % (schedule.length + 1) < 0) {
        possibility_count += schedule.length + 1;
    }

    // print the schedule with the caption
    print_schedule(schedule[possibility_count % (schedule.length + 1) - 1]);
    caption.innerHTML = "Timetable " + (possibility_count % (schedule.length + 1)) + "/" + schedule.length;

    // if the schedule was saved change the icon
    if(check_saved_exists(saved, schedule[possibility_count % (schedule.length + 1) - 1]) != -1) {
        saved_icon.setAttribute("src", "./icons/saved.png");
    }
    else {
        saved_icon.setAttribute("src", "./icons/not_saved.png");
    }
}

// check if the current schedule was already saved
function check_saved_exists(saved_schedules, current_schedule) {
    // if either of the current of saved schedules are undefined
    if(!current_schedule || !saved_schedules) {
        return -1;
    }

    // if there are no saved schedules
    if(saved_schedules.length == 0) {
        return -1;
    }

    // loop through all the saved schedules and check if there is a match
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
        // if there was a match, return the index of the match
        if(match) {
            return i;
        }
        // if there was no match return -1
        else if(!match && i == saved_schedules.length - 1) {
            return -1;
        }
    }
}

// when the save button is pressed then save the current schedule
function save_button_pressed(current_schedule) {
    if(!localStorage.getItem("saved")) {
        localStorage.setItem("saved", JSON.stringify(new Array()));
    }

    const saved = JSON.parse(localStorage.getItem("saved"));
    const saved_icon = document.querySelector(".saved_icon");
    const save_index = check_saved_exists(saved, current_schedule);

    // change the icon of the save button
    if(save_index == -1) {
        saved.push(current_schedule);
        saved_icon.setAttribute("src", "./icons/saved.png");
    }
    else {
        saved.splice(save_index, 1);
        saved_icon.setAttribute("src", "./icons/not_saved.png");
    }

    // save the schedule to the local storage
    localStorage.setItem("saved", JSON.stringify(saved));
}

// if a button is clicked on the generate schedule page
function schedule_click() {
    const next_button = document.querySelector(".next_course");
    const prev_button = document.querySelector(".previous_course");
    const save_button = document.querySelector(".save_button");
    const caption = document.querySelector(".table_caption");

    next_schedule(caption);

    if(!next_button || !prev_button || !save_button || !caption) {
        return;
    }

    // if the saved button is pressed
    save_button.addEventListener("click", function() {
        const index = possibility_count % (schedule.length + 1) - 1;
        save_button_pressed(schedule[index], index);
    });
    // if the enter key is pressed
    window.addEventListener("keydown", function(event) {
        if(event.key == "Enter") {
            const index = possibility_count % (schedule.length + 1) - 1;
            save_button_pressed(schedule[index], index);
        }
    });
    // change color when the mouse hovers over the save button
    save_button.addEventListener("mouseover", function(){
        save_button.style.backgroundColor = button_on_color;
    });
    save_button.addEventListener("mouseout", function(){
        save_button.style.backgroundColor = button_background_color;
    });

    // if the next button is pressed
    next_button.addEventListener("click", function() {
        next_schedule(caption);
    });
    // if the right arrow key is pressed
    window.addEventListener("keydown", function(event) {
        if(event.key == "ArrowRight") {
            next_schedule(caption);
        }
    });
    // change color when the mouse hovers over the next button
    next_button.addEventListener("mouseover", function(){
        next_button.style.backgroundColor = button_on_color;
    });
    next_button.addEventListener("mouseout", function(){
        next_button.style.backgroundColor = button_background_color;
    });

    // if the previous button is pressed
    prev_button.addEventListener("click", function() {
        previous_schedule(caption);
    });
    // if the left arrow key is pressed
    window.addEventListener("keydown", function(event) {
        if(event.key == "ArrowLeft") {
            previous_schedule(caption);
        }
    });
    // change color when the mouse hovers over the previous button
    prev_button.addEventListener("mouseover", function(){
        prev_button.style.backgroundColor = button_on_color;
    });
    prev_button.addEventListener("mouseout", function(){
        prev_button.style.backgroundColor = button_background_color;
    });
}

// if the next schedule button is pressed when saved schedule page is open
function next_saved_schedule(saved_schedules, saved_table_caption, saved_table) {
    if(!saved_table_caption) {
        return;
    }

    // go to the next saved schedule
    saved_count++;
    if(saved_count % (saved_schedules.length + 1) == 0) {
        saved_count++;
    }

    // print the schedule on the table
    print_on_table(saved_schedules[saved_count % (saved_schedules.length + 1) - 1], saved_table);
    saved_table_caption.innerHTML = "Timetable " + (saved_count % (saved_schedules.length + 1)) + "/" + saved_schedules.length;
}

// if the previous schedule button is pressed when saved schedule page is open
function previous_saved_schedule(saved_schedules, saved_table_caption, saved_table) {
    if(!saved_table_caption) {
        return;
    }

    // go to the previous saved schedule
    saved_count--;
    if(saved_count % (saved_schedules.length + 1) == 0) {
        saved_count--;
    }
    if(saved_count % (saved_schedules.length + 1) < 0) {
        saved_count += saved_schedules.length + 1;
    }

    // print the schedule on the table
    print_on_table(saved_schedules[saved_count % (saved_schedules.length + 1) - 1], saved_table);
    saved_table_caption.innerHTML = "Timetable " + (saved_count % (saved_schedules.length + 1)) + "/" + saved_schedules.length;
}

// delete schedule from saved list
function delete_from_saved(saved_schedules, saved_table, saved_table_caption, index) {
    // delete the schedule from all saved schedules
    saved_schedules.splice(index, 1);
    localStorage.setItem("saved", JSON.stringify(saved_schedules));

    // if there are no more saved schedules
    if(saved_schedules.length == 0) {
        print_blank_table(saved_table, saved_table_caption, "No saved timetables");
        return;
    }

    // if deleted schedule is the last one then return to the first schedule
    if(index == saved_schedules.length) {
        saved_count = 1;
    }


    // print the schedule on the table
    print_on_table(saved_schedules[index % saved_schedules.length], saved_table);
    saved_table_caption.innerHTML = "Timetable " + saved_count % (saved_schedules.length + 1) + "/" + saved_schedules.length;
}

// if a button is clicked on the saved schedule page
function print_saved_schedules() {
    const saved_table = document.querySelector(".saved_table");
    const saved_table_caption = document.querySelector(".saved_table_caption");
    const saved_previous_course = document.querySelector(".saved_previous_course");
    const saved_next_course = document.querySelector(".saved_next_course");
    const delete_saved_course = document.querySelector(".delete_saved_course");

    if(!saved_table || !saved_table_caption || !saved_previous_course || !saved_next_course || !delete_saved_course) {
        return;
    }
    else if(!localStorage.getItem("saved")) {
        print_blank_table(saved_table, saved_table_caption, "No saved timetables");
        return;
    }

    const saved_schedules = JSON.parse(localStorage.getItem("saved"));

    // if there are no saved schedules
    if(saved_schedules.length == 0) {
        print_blank_table(saved_table, saved_table_caption, "No saved timetables");
        return;
    }

    // print first saved schedule
    next_saved_schedule(saved_schedules, saved_table_caption, saved_table);

    // if the next button is pressed
    saved_next_course.addEventListener("click", function() {
        next_saved_schedule(saved_schedules, saved_table_caption, saved_table);
    });
    // if the right arrow key is pressed
    window.addEventListener("keydown", function(event) {
        if(event.key == "ArrowRight") {
            next_saved_schedule(saved_schedules, saved_table_caption, saved_table);
        }
    });
    // change color when the mouse hovers over the next button
    saved_next_course.addEventListener("mouseover", function(){
        saved_next_course.style.backgroundColor = button_on_color;
    });
    saved_next_course.addEventListener("mouseout", function(){
        saved_next_course.style.backgroundColor = button_background_color;
    });

    // if the previous button is pressed
    saved_previous_course.addEventListener("click", function() {
        previous_saved_schedule(saved_schedules, saved_table_caption, saved_table);
    });
    // if the left arrow key is pressed
    window.addEventListener("keydown", function(event) {
        if(event.key == "ArrowLeft") {
            previous_saved_schedule(saved_schedules, saved_table_caption, saved_table);
        }
    });
    // change color when the mouse hovers over the previous button
    saved_previous_course.addEventListener("mouseover", function(){
        saved_previous_course.style.backgroundColor = button_on_color;
    });
    saved_previous_course.addEventListener("mouseout", function(){
        saved_previous_course.style.backgroundColor = button_background_color;
    });

    // if the delete button is pressed
    delete_saved_course.addEventListener("click", function() {
        delete_from_saved(saved_schedules, saved_table, saved_table_caption, saved_count % (saved_schedules.length + 1) - 1);
    });
    // if the backspace key is pressed
    window.addEventListener("keydown", function(event) {
        if(event.key == "Backspace") {
            delete_from_saved(saved_schedules, saved_table, saved_table_caption, saved_count % (saved_schedules.length + 1) - 1);
        }
    });
    // change color when the mouse hovers over the delete button
    delete_saved_course.addEventListener("mouseover", function(){
        delete_saved_course.style.backgroundColor = button_on_color;
    });
    delete_saved_course.addEventListener("mouseout", function(){
        delete_saved_course.style.backgroundColor = button_background_color;
    });
}

// if a button is clicked on the when the schedule is zoomed on the schedule overview page
function print_zoomed_schedule(number) {
    const schedule_zoom = document.querySelector(".schedule_zoom");
    const clicked_schedule = document.querySelector(".clicked_schedule");
    const overview_table = document.querySelector(".overview_table");
    const overview_table_caption = document.querySelector(".overview_table_caption");
    const close_table = document.querySelector(".close_table");
    const saved_icon = document.querySelector(".saved_icon");
    const saved = JSON.parse(localStorage.getItem("saved"));
    const overview_prev = document.querySelector(".overview_prev");
    const overview_next = document.querySelector(".overview_next");

    if(!schedule_zoom || !clicked_schedule || !overview_table || !overview_table_caption || !close_table || !saved_icon || !overview_prev || !overview_next) {
        return;
    }

    // change icon of save button if already saved
    if(saved) {
        if(check_saved_exists(saved, schedule[number]) != -1) {
            saved_icon.setAttribute("src", "./icons/saved.png");
        }
        else {
            saved_icon.setAttribute("src", "./icons/not_saved.png");
        }
    }

    // make the schedule zoom popup visible
    schedule_zoom.style.display = "flex";

    // print the schedule on the popup
    print_on_table(schedule[number], overview_table);
    overview_table_caption.innerHTML = "Timetable " + (number + 1);

    // if the close button is pressed close the pop up
    close_table.addEventListener("click", function() {
        schedule_zoom.style.display = "none";
        overview_prev.style.visibility = "visible";
        overview_next.style.visibility = "visible";
    });
    // if the escape key is pressed close the pop up
    window.addEventListener("keydown", function(event) {
        if(event.key == "Escape") {
            schedule_zoom.style.display = "none";
            overview_prev.style.visibility = "visible";
            overview_next.style.visibility = "visible";
        }
    });
}

// generate the small tables on the schedule overview page
function generate_tables(table_in_table) {
    // create the schedules for the current page
    create_schedule();

    table_in_table.innerHTML = "";
    let not_enough = false;

    const outer_table = document.createElement("table");
    for(let i = 0; i < table_height; ++i) {
        // stop printing tables if the schedule reached the end
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
                for(let l = 0; l < days_of_week_map.size; ++l) {
                    const inner_td = document.createElement("td");
                    inner_tr.appendChild(inner_td);
                }
                inner_table.appendChild(inner_tr);
            }

            inner_table.addEventListener("click", function() {
                const overview_prev = document.querySelector(".overview_prev");
                const overview_next = document.querySelector(".overview_next");
                
                overview_prev.style.visibility = "hidden";
                overview_next.style.visibility = "hidden";

                print_zoomed_schedule(overview_start + i * table_width + j);
            });

            for(let k = 0; k < max_hours_per_day; ++k) {
                for(let l = 0; l < days_of_week_map.size; ++l) {
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

// create course legend on the left side of the schedule overview page
function create_course_legend() {
    const courses = JSON.parse(localStorage.getItem("courses"));
    const course_view = document.querySelector(".course_view");
    const color_list = document.createElement("ul");

    if(!courses) {
        return;
    }

    // loop through all the added courses
    for(let i = 0; i < courses.length; ++i) {
        const space_label = document.createElement("label");
        const color_item = document.createElement("li");

        // add the box next to the course code
        space_label.style.backgroundColor = colors.get(course_code_map.get(courses[i]));
        space_label.style.color = colors.get(course_code_map.get(courses[i]));
        space_label.style.paddingRight = "24%";
        space_label.style.marginRight = "10%";

        color_item.appendChild(space_label);

        // add the course code
        color_item.appendChild(document.createTextNode(courses[i]));
        color_item.style.fontWeight = "bold";
        color_list.appendChild(color_item);
    }

    course_view.appendChild(color_list);
}

// when a button is clicked in the schedule overview page
function multiple_schedules() {
    const table_in_table = document.querySelector(".table_in_table");
    const overview_prev = document.querySelector(".overview_prev");
    const overview_next = document.querySelector(".overview_next");
    const overview_save_button = document.querySelector(".overview_save_button");
    const overview_table_caption = document.querySelector(".overview_table_caption");
    const course_view = document.querySelector(".course_view");
    const schedule_zoom = document.querySelector(".schedule_zoom");

    
    if(!table_in_table || !overview_prev || !overview_next || !overview_save_button || !overview_table_caption || !course_view || !schedule_zoom) {
        return;
    }

    // if the user wants to go the previous page
    const left_click = function() {
        if(schedule_zoom.style.display == "flex") {
            // print the previous zoomed schedule
            const index = parseInt(overview_table_caption.innerHTML.substring(overview_table_caption.innerHTML.indexOf(" ") + 1, overview_table_caption.innerHTML.length)) - 1;
            if(index % (table_height * table_width) != 0) {
                print_zoomed_schedule(index - 1);
            }
            // if there is a page change
            else {
                // if on the first page
                if(index == 0) {
                    return;
                }
                overview_start -= table_height * table_width;
                generate_tables(table_in_table);
                print_zoomed_schedule(index - 1);
            }
            return;
        }

        // if the user wants to make a previous page change
        if(overview_start >= table_height * table_width) {
            overview_start -= table_height * table_width;
            generate_tables(table_in_table);
        }
    }
    const right_click = function() {
        if(schedule_zoom.style.display == "flex") {
            // print the next zoomed schedule
            let index = parseInt(overview_table_caption.innerHTML.substring(overview_table_caption.innerHTML.indexOf(" ") + 1, overview_table_caption.innerHTML.length)) - 1;
            if((index + 1) % (table_height * table_width) != 0) {
                if(!table_in_table.querySelector("table").rows[parseInt(((index+1) % (table_height * table_width)) / table_width)].cells[((index+1) % (table_height * table_width)) % table_width]) {
                    overview_start = 0;
                    index = -1;
                    generate_tables(table_in_table);
                }
                print_zoomed_schedule(index + 1);
            }
            // if there is a page change
            else {
                overview_start += table_height * table_width;
                generate_tables(table_in_table);

                // if end of last page reached
                if(table_in_table.innerHTML.includes("<tr></tr>")) {
                    overview_start = 0;
                    generate_tables(table_in_table);
                    index = -1;
                }

                print_zoomed_schedule(index + 1);
            }
            return;
        }

        // if the user wants to make a next page change
        if(overview_start + table_height * table_width <= schedule.length) {
            overview_start += table_height * table_width;
            generate_tables(table_in_table);

            // if end of last page reached
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

    // if the left arrow key is pressed
    overview_prev.addEventListener("click", left_click);
    window.addEventListener("keydown", function(event) {
        if(event.key == "ArrowLeft") {
            left_click();
        }
    });

    // if the right arrow key is pressed
    overview_next.addEventListener("click", right_click);
    window.addEventListener("keydown", function(event) {
        if(event.key == "ArrowRight") {
            right_click();
        }
    });

    // change color when the mouse hovers over the previous button
    overview_prev.addEventListener("mouseover", function(){
        overview_prev.style.backgroundColor = button_on_color;
    });
    overview_prev.addEventListener("mouseout", function(){
        overview_prev.style.backgroundColor = button_background_color;
    });

    // change color when the mouse hovers over the next button
    overview_next.addEventListener("mouseover", function(){
        overview_next.style.backgroundColor = button_on_color;
    });
    overview_next.addEventListener("mouseout", function(){
        overview_next.style.backgroundColor = button_background_color;
    });

    // if the save button is clicked
    overview_save_button.addEventListener("click", function() {
        const caption = overview_table_caption.innerHTML;
        const index = caption.substring((caption.indexOf(" ") + 1), caption.length) - 1;
        save_button_pressed(schedule[index], index);
    });
    // if the enter key is pressed
    window.addEventListener("keydown", function(event) {
        if(event.key == "Enter") {
            const caption = overview_table_caption.innerHTML;
            const index = caption.substring((caption.indexOf(" ") + 1), caption.length) - 1;
            save_button_pressed(schedule[index], index);
        }
    });
    // change color when the mouse hovers over the save button
    overview_save_button.addEventListener("mouseover", function(){
        overview_save_button.style.backgroundColor = button_on_color;
    });
    overview_save_button.addEventListener("mouseout", function(){
        overview_save_button.style.backgroundColor = button_background_color;
    });

    // create the course legend and generate the tables
    create_course_legend();
    generate_tables(table_in_table);

    // if there is no possible schedule then hide the buttons
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

// send search to server
async function get_info(course_code) {
    // add the course code to the url
    let url = baseUrl + "course?key=" + course_code;

    // add the selected faculties to the url
    const faculty = JSON.parse(localStorage.getItem("faculty"));
    for(let i = 0; i < faculty.length; ++i) {
        url += "&faculty=" + faculty_list_map.get(faculty[i]);
    }

    // add the selected sessions to the url
    const session = JSON.parse(localStorage.getItem("session"));
    for(let i = 0; i < session.length; ++i) {
        url += "&session=" + session_list_map.get(session[i]);
    }

    // send the url to server
    const res = await fetch(url, {
      method: "GET"
    });

    // get the data and return
    const data = await res.text();
    return data;
}

// send search to server after multiple results
async function get_info_selected(result) {
    const faculty = JSON.parse(localStorage.getItem("faculty"));
    result.faculty = new Array();

    // add the selected faculties to the result
    for(let i = 0; i < faculty.length; ++i) {
        result.faculty.push(faculty_list_map.get(faculty[i]));
    }

    const session = JSON.parse(localStorage.getItem("session"));
    result.session = new Array();

    // add the selected sessions to the result
    for(let i = 0; i < session.length; ++i) {
        result.session.push(session_list_map.get(session[i]));
    }

    // send the url to the server with result
    const res = await fetch(baseUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(result)
    });

    // get the data and return
    const data = await res.text();
    return data;
}

// add the course to the local storage and display it on main page
function add_course(result, course_code, course_term) {
    const courses = JSON.parse(localStorage.getItem("courses"));
    const searching_load_screen = document.querySelector(".searching_load_screen");

    // display error message if more than 6 courses
    if(courses && courses.length > 5) {
        searching_load_screen.innerHTML = "Cannot take more than 6 courses";
        return;
    }

    if(!localStorage.getItem("course_term")) {
        localStorage.setItem("course_term", course_term);
    }
    
    // if session is not unified
    if(course_term != localStorage.getItem("course_term") && course_term != "Y") {
        searching_load_screen.innerHTML = "Cannot have both fall and winter term courses";
        return;
    }

    // add course to local storage and main page
    if(!courses || !courses.includes(course_code)) {
        searching_load_screen.innerHTML = "Added " + course_code + " " + course_term + " to list";
        add_course_to_storage(course_code);
        add_course_data_to_storage(result);
        add_new_element(course_code, course_term);
    }
    // if the course already exists display an error message
    else {
        searching_load_screen.innerHTML = course_code + " already exists";
    }
}

// find the course from server
function find_course(course_code) {
    const course_info = get_info(course_code);
    const loading = document.querySelector(".loading");
    const searching_load_screen = document.querySelector(".searching_load_screen");
    const search_text = document.querySelector(".search_text");

    course_info.then(result => {
        // no result found
        if(result.search("not found") != -1) {
            const index = result.search("not found");

            // display error message
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

            // if two different sessions were added
            if(course_term != localStorage.getItem("course_term") && course_term != "Y") {
                searching_load_screen.innerHTML = "Cannot have both fall and winter term courses";
            }
            // if same sessions were added
            else {
                add_course(result, course_code, course_term);
            }
        }

        // close the loading message after 1 second
        setTimeout(function() {
            loading.style.display = "none";
            searching_load_screen.innerHTML = "";
            search_text.removeAttribute("disabled");
            search_text.focus();
        }, 1000);
    });
}

// add course to local storage
function add_course_to_storage(course_code) {
    if(!localStorage.getItem("courses")) {
        localStorage.setItem("courses", JSON.stringify(new Array()));
    }

    const courses = JSON.parse(localStorage.getItem("courses"));
    courses.push(course_code);
    localStorage.setItem("courses", JSON.stringify(courses));
}

// add course data to local storage
function add_course_data_to_storage(result) {
    if(!localStorage.getItem("course_data")) {
        localStorage.setItem("course_data", JSON.stringify(new Array()));
    }
    const course_data = JSON.parse(localStorage.getItem("course_data"));
    course_data.push(JSON.parse(result));
    localStorage.setItem("course_data", JSON.stringify(course_data));
}

// find the course that was searched
function searched() {
    const search_text = document.querySelector(".search_text");
    const loading = document.querySelector(".loading");
    const searching_load_screen = document.querySelector(".searching_load_screen");

    if(!search_text || !loading || !searching_load_screen) {
        return;
    }

    // add loading message
    search_text.setAttribute("disabled", "disabled");
    loading.style.display = "flex";
    searching_load_screen.innerHTML = "Searching for " + search_text.value + "...";

    // find the course
    find_course(search_text.value);

    search_text.value = "";
}

// when the user clicks on the X in the course list remove the course from the local storage
function remove_element(remove, item, course_list) {
    remove.addEventListener("click", function() {
        const courses = JSON.parse(localStorage.getItem("courses"));
        const course_data = JSON.parse(localStorage.getItem("course_data"));
        
        item.removeChild(remove);
        course_list.removeChild(item);

        // remove the course and course data from the local storage
        for(let i = 0; i < courses.length; ++i) {
            if(courses[i] == item.innerHTML.substring(0, item.innerHTML.indexOf(" "))) {
                courses.splice(i, 1);
                course_data.splice(i, 1);
            }
        }

        // reset the local storage item
        localStorage.setItem("courses", JSON.stringify(courses));
        localStorage.setItem("course_data", JSON.stringify(course_data));

        // if there are no more courses delete the course term
        if(courses.length == 0) {
            if(localStorage.getItem("course_term")) {
                localStorage.removeItem("course_term");
            }
        }
    });
}

// parse the course description with capital letters
function parse_description(description) {
    // loop through the course description and find the letter after "." and capitalize it
    for(let i = 0; i < description.length; ++i) {
        if(description[i] == "." && i != description.length - 1) {
            const left = description.substring(0, i + 2);
            const right = description.substring(i + 3);
            if(description[i + 2]) {
                description = left + description[i + 2].toUpperCase() + right;
            }
        }
    }

    // capitalize the first letter
    description = description[0].toUpperCase() + description.substring(1, description.length);

    return description;
}

// displays the course description with its info
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
    pop_up.scrollTop = 0;
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

        table.style.border = "2px solid black";

        section.appendChild(document.createTextNode(course_data[index][i].teach_method + course_data[index][i].section_number));
        section.style.fontWeight = "bold";
        section.style.fontSize = "20px";
        course_info_div.appendChild(section);
        
        const tr_head = document.createElement("tr");
        const tr_body = document.createElement("tr");

        for(let j = 0; j < description_table_list.length; ++j) {
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

    // if the escape key is pressed
    window.addEventListener("keydown", function(event) {
        if(event.key == "Escape") {
            pop_up.style.display = "none";
            pop_up_results.innerHTML = "";
            pop_up_results.style.width = "50%";
            pop_up_results.style.height = "40%";
        }
    });

    // if the close button is clicked
    close.addEventListener("click", function() {
        pop_up.style.display = "none";
        pop_up_results.innerHTML = "";
        pop_up_results.style.width = "50%";
        pop_up_results.style.height = "40%";
    });
}

// add new course element to the main page
function add_new_element(course_name, course_term) {
    const course_list = document.querySelector(".course_list");
    const item = document.createElement("li");
    const remove = document.createElement("span");

    // if X was clicked to remove an element
    remove_element(remove, item, course_list);

    // create the list of courses
    remove.appendChild(document.createTextNode("X"));
    item.appendChild(document.createTextNode(course_name + " " + course_term));
    item.appendChild(remove);
    course_list.appendChild(item);

    // if the course code was clicked open the course description
    item.addEventListener("click", function(){
        press_course_list(item);
    });
    // change color when the mouse hovers over the course list
    item.addEventListener("mouseover", function(){
        item.style.color = "blue";
        remove.style.color = "black";
    });
    item.addEventListener("mouseout", function(){
        item.style.color = "black";
    });
}

// add all the previous elements to the main page
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
        // loop through all the courses
        for(let i = 0; i < courses.length; ++i) {
            const course_list = document.querySelector(".course_list");
            const item = document.createElement("li");
            const remove = document.createElement("span");

            // loop through all the course data to find the course term
            for(let j = 0 ; j < course_data.length; ++j) {
                if(course_data[j][0].course_code == courses[i]) {
                    course_term = course_data[j][0].course_term;
                }
            }

            // if X was clicked to remove an element
            remove_element(remove, item, course_list);
    
            // create the list of courses
            remove.appendChild(document.createTextNode("X"));
            item.appendChild(document.createTextNode(courses[i] + " " + course_term));
            item.appendChild(remove);
            course_list.appendChild(item);

            // if the course code was clicked open the course description
            item.addEventListener("click", function(){
                press_course_list(item);
            });
            // change color when the mouse hovers over the course list
            item.addEventListener("mouseover", function(){
                item.style.color = "blue";
                remove.style.color = "black";
            });
            item.addEventListener("mouseout", function(){
                item.style.color = "black";
            });

        }
    }
}

// when the search button is clicked
function course_search() {
    const search_button = document.querySelector(".search_button");
    const search_text = document.querySelector(".search_text");

    if(!search_button || !search_text) {
        return;
    }

    // if the enter key is pressed
    window.addEventListener("keydown", function(event) {
        if(event.key == "Enter") {
            searched();
        }
    });
    
    // if the search button is clicked
    search_button.addEventListener("click", function() {
        searched();
    });
}

// reset the local storage
function local_storage_reset() {
    const current_month = new Date().getMonth() + 1;

    // reset the faculty with engineering and art sci
    localStorage.setItem("faculty", JSON.stringify(new Array(
        faculty_list[0],
        faculty_list[1]
    )));
    // if the current month is between may and october then set the session to fall otherwise set it to winter
    localStorage.setItem("session", JSON.stringify(new Array(
        session_list[(current_month > 4 && current_month < 11) ? 0 : 1],
        session_list[2]
    )));
    // reset the preference for start and end time
    localStorage.setItem("start_time", first_hour);
    localStorage.setItem("end_time", last_hour);

    // reset the loaded and ignore conflict
    localStorage.setItem("loaded", true);
    localStorage.setItem("ignore_conflict", false);
}

// initialize the local storage
function init_local_storage() {
    // if its the first time loading the screen
    if(!localStorage.getItem("loaded")) {
        localStorage.setItem("loaded", true);
    }
    // reset local storage if its the first time loading the screen
    if(JSON.parse(localStorage.getItem("loaded")) != true) {
        local_storage_reset();
    }
}

// clear the local storage
function clear_local_storage() {
    const clear_storage = document.querySelector(".clear_storage");
    const course_list = document.querySelector(".course_list");

    if(!clear_storage || !course_list) {
        return;
    }

    // clear the local storage when the "Timetable" label is clicked
    clear_storage.addEventListener("click", function() {
        localStorage.clear();
        course_list.innerHTML = "";
        local_storage_reset();
    });
}

// open pop up of search matches and get info of the selected course
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

    // open pop up with search matches
    pop_up.style.display = "flex";
    pop_up.scrollTop = 0;
    loading.style.display = "none";

    searched.appendChild(document.createTextNode("Search results for " + search));
    searched.style.fontWeight = "bold";
    pop_up_results.appendChild(searched);

    close.appendChild(document.createTextNode("X"));
    pop_up_results.appendChild(close);

    // close pop up when escape key is pressed
    window.addEventListener("keydown", function(event) {
        if(event.key == "Escape") {
            pop_up.style.display = "none";
            pop_up_results.innerHTML = "";
            search_text.removeAttribute("disabled");
            search_text.focus();
        }
    });

    // close pop up when close button is clicked
    close.addEventListener("click", function() {
        pop_up.style.display = "none";
        pop_up_results.innerHTML = "";
        search_text.removeAttribute("disabled");
        search_text.focus();
    });

    // loop through the results
    for(let i = 0; i < results.length; ++i) {
        const item = document.createElement("li");
        item.style.cursor = "pointer";
        
        // add the item to the list of matches
        item.appendChild(document.createTextNode(results[i].course_code + " " + results[i].course_term + ": " + results[i].course_name));
        pop_up_results.appendChild(item);

        // if a course was selected
        item.addEventListener("click", function() {
            // get the course info of the selected course
            const selected_result = get_info_selected(results[i]);
            pop_up.style.display = "none";
            pop_up_results.innerHTML = "";
            loading.style.display = "flex";
            searching_load_screen.innerHTML = "";

            // add the selected course
            selected_result.then(result => {
                add_course(result, results[i].course_code, results[i].course_term);

                // close load message after 1 second
                setTimeout(function() {
                    loading.style.display = "none";
                    searching_load_screen.innerHTML = "";
                    search_text.removeAttribute("disabled");
                    search_text.focus();
                }, 1000);
            });

        });

        // change color when the mouse hovers over the searched course list
        item.addEventListener("mouseover", function(){
            item.style.color = button_on_color;
        });
        item.addEventListener("mouseout", function(){
            item.style.color = "black";
        });
    }
}

// add the selected filter to local storage
function add_filter_to_storage(type, element) {
    if(!localStorage.getItem(type)) {
        localStorage.setItem(type, JSON.stringify(new Array()));
    }

    const arr = JSON.parse(localStorage.getItem(type));
    arr.push(element);
    localStorage.setItem(type, JSON.stringify(arr));
}

// remove selected filter from local storage
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

// find selected filter in local storage
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

// add which sections to exclude to the local storage
function add_exclude_to_storage(type, element) {
    add_filter_to_storage(type, element);
}

// remove which sections to exclude to the local storage
function remove_exclude_to_storage(type, element) {
    if(!localStorage.getItem(type)) {
        return;
    }

    const arr = JSON.parse(localStorage.getItem(type));
    let index = -1;

    // loop through all the sections and find match
    for(let i = 0; i < arr.length; ++i) {
        if(arr[i].course_code == element.course_code &&
            arr[i].section_number == element.section_number &&
            arr[i].teach_method == element.teach_method) {
            index = i;
        }
    }

    // if there was a match remove it from the array
    if(index != -1) {
        arr.splice(index, 1);
    }

    // reset the local storage item
    localStorage.setItem(type, JSON.stringify(arr));
}

// find wheter the section to exclude is already added to local storage
function find_exclude_in_storage(type, element) {
    if(!localStorage.getItem(type)) {
        return false;
    }

    const arr = JSON.parse(localStorage.getItem(type));

    // loop through the local storage to find a match
    for(let i = 0; i < arr.length; ++i) {
        if(arr[i].course_code == element.course_code &&
            arr[i].section_number == element.section_number &&
            arr[i].teach_method == element.teach_method) {
            return true;
        }
    }

    // if no match
    return false;
}

// sort the course data in terms of section number and section type
function sort_course_data(data) {
    const sorted_data = new Array();
    // loop through the course data
    for(let i = 0; i < data.length; ++i) {
        const lec = new Array();
        const tut = new Array();
        const pra = new Array();
        for(let j = 0; j < data[i].length; ++j) {
            // separate the lec into a new array
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
            // separate the tut into a new array
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
            // separate the pra into a new array
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
        // sort the sections in order of the section number
        lec.sort((course1, course2) => course1.section_number - course2.section_number);
        tut.sort((course1, course2) => course1.section_number - course2.section_number);
        pra.sort((course1, course2) => course1.section_number - course2.section_number);
        
        // push into the array in order of lec, tut then pra
        sorted_data[i] = lec.concat(tut, pra);
    }

    // return the sorted data
    return sorted_data;
}

// count the number of sections and the number of excluded ones
function check_section_exclude(course_data, course_index, section_index) {
    let section_count = 0;
    let exclude_count = 0;
    const selected_teach_method = course_data[course_index][section_index].teach_method;
    const selected_course_code = course_data[course_index][section_index].course_code
    const excluded_data = JSON.parse(localStorage.getItem("exclude"));

    // count the number of sections
    for(let i = 0; i < course_data[course_index].length; ++i) {
        if(selected_teach_method == course_data[course_index][i].teach_method) {
            section_count++;
        }
    }

    // count the number of excluded sections
    if(excluded_data) {
        for(let i = 0; i < excluded_data.length; ++i) {
            if(selected_teach_method == excluded_data[i].teach_method &&
                selected_course_code == excluded_data[i].course_code) {
                exclude_count++;
            }
        }
    }

    // if the two numbers match then return false
    if(exclude_count == section_count - 1) {
        return false;
    }
    // else return true
    return true;

}

// convert 24h time to 12h time
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

// when the filter label is clicked
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
        pop_up.scrollTop = 0;

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

// when the exclude label is clicked
function open_exclude() {
    const exclude = document.querySelector(".exclude");
    const pop_up = document.querySelector(".pop_up");
    const pop_up_results = document.querySelector(".pop_up_results");
    const loading = document.querySelector(".loading");
    const searching_load_screen = document.querySelector(".searching_load_screen");

    if(!exclude || !pop_up || !pop_up_results || !loading || !searching_load_screen) {
        return;
    }
    
    exclude.addEventListener("click", function() {
        if(!localStorage.getItem("course_data") || JSON.parse(localStorage.getItem("course_data")).length == 0) {
            return;
        }

        const close_exclude = document.createElement("button");
        const course_data = sort_course_data(JSON.parse(localStorage.course_data));

        pop_up.style.display = "flex";
        pop_up.scrollTop = 0;

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
                    if(!check_section_exclude(course_data, i, j) && !check_box.checked) {
                        loading.style.display = "flex";
                        searching_load_screen.innerHTML = "Cannot remove all sections";
                        check_box.checked = true;

                        setTimeout(function() {
                            loading.style.display = "none";
                            searching_load_screen.innerHTML = "";
                        }, 1000);

                        return;
                    }

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

// when the preference label is clicked
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
        pop_up.scrollTop = 0;

        close_preference.appendChild(document.createTextNode("X"));
        pop_up_results.appendChild(close_preference);

        const start_label = document.createElement("label");
        const start_time_slider = document.createElement("input");
        const start_time_label = document.createElement("label");
        const start_div = document.createElement("div");

        start_label.style.fontWeight = "bold";
        start_label.style.marginRight = "20%";

        start_time_slider.type = "range";
        start_time_slider.min = first_hour;
        start_time_slider.max = last_hour - 1;
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
        end_time_slider.min = first_hour + 1;
        end_time_slider.max = last_hour;
        end_time_slider.value = JSON.parse(localStorage.getItem("end_time"));

        end_time_label.style.marginLeft = "2%";

        end_label.appendChild(document.createTextNode(preference_list[1]));
        end_time_label.appendChild(document.createTextNode(convert_am_pm(end_time_slider.value)));
        end_div.appendChild(end_label);
        end_div.appendChild(end_time_slider);
        end_div.appendChild(end_time_label);
        pop_up_results.appendChild(end_div);

        const conflict_label = document.createElement("label");
        const conflict_confirm_label = document.createElement("label");
        const conflict_checkbox = document.createElement("input");
        const conflict_div = document.createElement("div");

        conflict_checkbox.type = "checkbox";
        conflict_label.style.fontWeight = "bold";
        conflict_label.style.marginRight = "8%";
        conflict_confirm_label.style.marginLeft = "10%";

        conflict_label.appendChild(document.createTextNode("Ignore Tutorial Conflicts"));

        if(JSON.parse(localStorage.getItem("ignore_conflict"))) {
            conflict_confirm_label.appendChild(document.createTextNode("Yes"));
            conflict_checkbox.checked = true;
        }
        else {
            conflict_confirm_label.appendChild(document.createTextNode("No"));
            conflict_checkbox.checked = false;
        }
;
        conflict_div.appendChild(conflict_label);
        conflict_div.appendChild(conflict_checkbox);
        conflict_div.appendChild(conflict_confirm_label);
        pop_up_results.appendChild(conflict_div);

        conflict_checkbox.addEventListener("change", function() {
            if(conflict_checkbox.checked) {
                conflict_confirm_label.innerHTML = "Yes";
                localStorage.setItem("ignore_conflict", true);
            }
            else {
                conflict_confirm_label.innerHTML = "No";
                localStorage.setItem("ignore_conflict", false);
            }
        })

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

// main function
function main() {
    // create schedule
    parse_json();
    create_permutations();

    // print schedule
    print_all_schedules();
    schedule_click();
    print_saved_schedules();
    multiple_schedules();

    // initialize
    clear_local_storage();
    init_local_storage();
    
    // course search
    course_search();
    add_previous_elements();
    open_filter();
    open_exclude();
    open_preference();
}

// map of all courses
const course_code_map = new Map();
// map of all section type
const course_section_map = new Map([
    ["LEC", 0],
    ["TUT", 1],
    ["PRA", 2]
]);
// list of week days
const days_of_week_list = new Array(
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
);
// map of weekdays with index
const days_of_week_map = new Map([
    [days_of_week_list[0], 0],
    [days_of_week_list[1], 1],
    [days_of_week_list[2], 2],
    [days_of_week_list[3], 3],
    [days_of_week_list[4], 4]
]);
// map of color of schedule
const colors = new Map([
    [0, "rgb(110, 77, 188)"], // purple
    [1, "rgb(29, 153, 111)"], // green
    [2, "rgb(209,84,31)"], // orange
    [3, "rgb(201,73,145)"], // pink
    [4, "rgb(212,138,52)"], // yellow
    [5, "rgb(173, 216, 250)"], // blue
]);
// list of faculties
const faculty_list = new Array(
    "Faculty of Applied Science & Engineering",
    "Faculty of Arts and Science",
    "Faculty of Kinesiology and Physical Education",
    "Faculty of Music",
    "John H. Daniels Faculty of Architecture, Landscape, & Design"
);
// map of faculties with its abbreviation
const faculty_list_map = new Map([
    [faculty_list[0], "APSC"],
    [faculty_list[1], "ARTSC"],
    [faculty_list[2], "FPEH"],
    [faculty_list[3], "MUSIC"],
    [faculty_list[4], "ARCLA"]
]);
// list of sessions
const session_list = new Array(
    "Fall 2023 (F)",
    "Winter 2024 (S)",
    "Fall-Winter 2023-2024 (Y)"
);
// map of sessions with its abbreviation
const session_list_map = new Map([
    [session_list[0], "20239"],
    [session_list[1], "20241"],
    [session_list[2], "20239-20241"]
]);
// list of preferences
const preference_list = new Array(
    "Start Time",
    "End Time"
);
// list of course description table
const description_table_list = new Array(
    "Time",
    "Location",
    "Instructor",
    "Space Availability"
);

// base url of server
const baseUrl = "http://localhost:3000/";

// count the number of courses
let course_count = 0;
// count the current displaying schedule
let possibility_count = 0;
// count the current displaying saved schedule
let saved_count = 0;
// count the current displaying overview schedule
let overview_start = 0;
// total number of all permutations
let total_permutations = 0;
// check if last schedule
let last_schedule = false;

// overview table height
const table_height = 2;
// overview table width
const table_width = 7;
// maximum hours for courses per day
const max_hours_per_day = 12;
// earliest course start time
const first_hour = 9;
// latest course end time
const last_hour = 21;
// array of searched courses
const all_courses = new Array();
// current count of permutations
const counter = new Array();
// array of schedules
const schedule = new Array();

// color of button
const button_background_color = "darkgray";
// color of button while hovering
const button_on_color = "lightblue";

// main function
main();
