from itertools import product
from tabulate import tabulate

courses = {
    'ECE302': {
        'lec': {
            'lec0101': [('Tuesday', 11, 12), ('Thursday', 11, 12), ('Friday', 11, 12)],
            'lec0102': [('Tuesday', 9, 10), ('Thursday', 9, 10), ('Friday', 9, 10)],
            'lec0103': [('Tuesday', 9, 10), ('Thursday', 9, 10), ('Friday', 9, 10)]
        },
        'tut': {
            'tut0101': [('Wednesday', 10, 12)],
            'tut0102': [('Wednesday', 10, 12)],
            'tut0103': [('Friday', 13, 15)],
            'tut0104': [('Friday', 13, 15)],
            'tut0105': [('Wednesday', 12, 14)]
        }
    },
    'ECE344': {
        'lec': {
            'lec0101': [('Monday', 13, 14), ('Tuesday', 13, 14), ('Thursday', 13, 14)],
            'lec0102': [('Tuesday', 15, 16), ('Wednesday', 15, 16), ('Friday', 15, 16)],
            'lec0103': [('Tuesday', 17, 18), ('Wednesday', 17, 18), ('Friday', 17, 18)]
        },
        'pra': {
            'pra0101': [('Wednesday', 15, 18)],
            'pra0102': [('Tuesday', 12, 15)],
            'pra0103': [('Tuesday', 9, 12)],
            'pra0104': [('Thursday', 12, 15)],
        }
    },
    'ECE345': {
        'lec': {
            'lec0101': [('Monday', 15, 16), ('Wednesday', 12, 13), ('Thursday', 15, 16)],
            'lec0102': [('Monday', 16, 17), ('Wednesday', 13, 14), ('Thursday', 16, 17)],
            'lec0103': [('Tuesday', 16, 17), ('Wednesday', 16, 17), ('Friday', 16, 17)]
        },
        'tut': {
            'tut0101': [('Friday', 13, 15)],
            'tut0102': [('Monday', 9, 11)],
            'tut0103': [('Thursday', 10, 12)],
            'tut0104': [('Monday', 9, 11)],
            'tut0105': [('Thursday', 10, 12)]
        }
    },
    'ECE320': {
        'lec': {
            'lec0101': [('Monday', 14, 15), ('Wednesday', 14, 15), ('Thursday', 14, 15)],
            'lec0102': [('Monday', 14, 15), ('Wednesday', 14, 15), ('Thursday', 14, 15)]
        },
        'tut': {
            'tut0101': [('Tuesday', 18, 19)],
            'tut0102': [('Tuesday', 18, 19)],
            'tut0103': [('Monday', 13, 14)],
            'tut0104': [('Monday', 13, 14)]
        },
        'pra': {
            'pra0101': [('Tuesday', 15, 18)],
            'pra0102': [('Tuesday', 15, 18)],
            'pra0103': [('Wednesday', 15, 18)],
            'pra0104': [('Wednesday', 15, 18)],
            'pra0105': [('Wednesday', 9, 12)],
            'pra0106': [('Wednesday', 9, 12)],
            'pra0107': [('Thursday', 15, 18)],
            'pra0108': [('Thursday', 15, 18)],
            'pra0109': [('Monday', 9, 12)],
            'pra0111': [('Friday', 15, 18)],
            'pra0113': [('Monday', 15, 18)]
        }
    },
}

# Function to generate all combinations for each course
def generate_combinations(courses):
    course_combinations = []
    
    for course in courses.values():
        lec_options = list(course['lec'].items())
        tut_options = list(course.get('tut', {}).items()) or [(None, [None])]
        pra_options = list(course.get('pra', {}).items()) or [(None, [None])]
        
        # Generate all combinations of lec, tut, and pra for this course
        course_combinations.append(product(lec_options, tut_options, pra_options))
    
    # Cartesian product to get all combinations across all courses
    return product(*course_combinations)

# Function to check for conflicts in the timetable
def is_conflicting(slot1, slot2):
    # If either slot is None, no conflict
    if slot1 is None or slot2 is None:
        return False
    # Check if the day is the same and times overlap
    return slot1[0] == slot2[0] and not (slot1[2] <= slot2[1] or slot2[2] <= slot1[1])

def has_conflicts(timetable):
    # Flatten the timetable to extract all the time slots
    time_slots = [slot for course in timetable for session in course if session for slot in session[1] if slot is not None]
    
    # Check for conflicts between any two time slots
    for i, slot1 in enumerate(time_slots):
        for j, slot2 in enumerate(time_slots):
            if i != j and is_conflicting(slot1, slot2):
                return True
    return False

# Function to generate valid timetables with no conflicts
def generate_valid_timetables(courses):
    all_combinations = generate_combinations(courses)
    valid_timetables = []
    
    # Check each timetable for conflicts
    for timetable in all_combinations:
        if not has_conflicts(timetable):
            valid_timetables.append(timetable)
    
    return valid_timetables

# Function to fill and print timetable
def print_course_timetable(valid_timetables, courses):
    # Define days and time slots
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    time_slots = [(hour, hour + 1) for hour in range(9, 21)]  # Time slots from 9 to 21

    # Create an empty timetable
    timetable = [['' for _ in range(6)] for _ in range(len(time_slots))]
    timetable.insert(0, ['Time'] + days)  # Add header

    # Fill timetable for valid timetables
    for idx, timetable_data in enumerate(valid_timetables, 1):
        print(f"\nTimetable {idx}:")
        
        # Clear timetable
        for i in range(len(time_slots)):
            timetable[i + 1] = [''] * 6
        
        for course_index, course in enumerate(timetable_data):
            lec, tut, pra = course
            course_code = list(courses.keys())[course_index]  # Get course code
            
            # Fill lecture times
            lec_section, lec_times = lec
            for lec_slot in lec_times:
                day_index = days.index(lec_slot[0])
                start_hour = lec_slot[1]
                end_hour = lec_slot[2]
                
                # Fill the timetable with course code and specific lecture section
                for hour in range(start_hour, end_hour):
                    timetable[hour - 9 + 1][day_index + 1] = f"{course_code} ({lec_section})"

            # Fill tutorial times (if exists)
            if tut is not None and tut[1] != [None]:
                tut_section, tut_times = tut
                for tut_slot in tut_times:
                    day_index = days.index(tut_slot[0])
                    start_hour = tut_slot[1]
                    end_hour = tut_slot[2]
                    
                    # Fill the timetable with course code and specific tutorial section
                    for hour in range(start_hour, end_hour):
                        timetable[hour - 9 + 1][day_index + 1] = f"{course_code} ({tut_section})"
            
            # Fill practical times (if exists)
            if pra is not None and pra[1] != [None]:
                pra_section, pra_times = pra
                for pra_slot in pra_times:
                    day_index = days.index(pra_slot[0])
                    start_hour = pra_slot[1]
                    end_hour = pra_slot[2]
                    
                    # Fill the timetable with course code and specific practical section
                    for hour in range(start_hour, end_hour):
                        timetable[hour - 9 + 1][day_index + 1] = f"{course_code} ({pra_section})"

        # Add time slots to the time column
        for i, (start_hour, end_hour) in enumerate(time_slots):
            timetable[i + 1][0] = f"{start_hour}:00 - {end_hour}:00"

        # Print the timetable
        print(tabulate(timetable, headers="firstrow", tablefmt="grid"))

# Example usage
valid_timetables = generate_valid_timetables(courses)

# Output valid timetables in a nicer table format
print_course_timetable(valid_timetables, courses)
