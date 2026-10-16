// Rule: Max marks are 35
export const calculateGrade = (marks, attendanceStatus) => {
    if (attendanceStatus === 'ABSENT' || marks === null) return 'ABSENT';

    const m = parseFloat(marks);
    if (m >= 30) return 'A';
    if (m >= 25) return 'B';
    if (m >= 18) return 'C';
    if (m >= 10) return 'D';
    return 'E';
};