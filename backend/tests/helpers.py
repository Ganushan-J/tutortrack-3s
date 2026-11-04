def valid_student(**overrides):
    data = {
        "firstName": "Alex",
        "lastName": "Taylor",
        "yearGroup": "Year 11",
        "examBoard": "AQA",
        "tier": "Higher",
        "currentGrade": 6,
        "targetGrade": 8,
        "learningGoals": ["Secure algebra"],
        "nextTopic": "Linear equations",
    }
    data.update(overrides)
    return data


def valid_lesson(**overrides):
    data = {
        "studentId": "stu_alex",
        "date": "2026-11-04",
        "startTime": "17:00",
        "durationMinutes": 60,
        "status": "scheduled",
        "topicsCovered": ["Linear equations"],
        "strengths": "Quick with negatives",
        "difficulties": "Rearranging",
        "homework": "Worksheet A",
        "resourceLinks": ["https://corbettmaths.com/5-a-day/gcse/"],
        "nextLessonPlan": "Recap rearranging",
    }
    data.update(overrides)
    return data
