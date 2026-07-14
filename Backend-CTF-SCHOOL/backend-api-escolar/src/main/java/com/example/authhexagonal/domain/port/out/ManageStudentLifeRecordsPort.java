package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.StudentLifeRecord;
import com.example.authhexagonal.domain.model.StudentLifeRecordCommand;

import java.util.List;
import java.util.Optional;

public interface ManageStudentLifeRecordsPort {
    boolean existsStudent(Long studentId);

    List<StudentLifeRecord> findByStudentId(Long studentId);

    StudentLifeRecord create(StudentLifeRecordCommand command);

    Optional<StudentLifeRecord> findById(Long recordId);

    StudentLifeRecord update(Long recordId, StudentLifeRecordCommand command);

    void delete(Long recordId);
}
