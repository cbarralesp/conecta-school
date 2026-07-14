package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.StudentLifeRecord;
import com.example.authhexagonal.domain.model.StudentLifeRecordCommand;

import java.util.List;

public interface ManageStudentLifeRecordsUseCase {
    List<StudentLifeRecord> findByStudentId(Long studentId);

    StudentLifeRecord findById(Long recordId);

    StudentLifeRecord create(StudentLifeRecordCommand command);

    StudentLifeRecord update(Long recordId, StudentLifeRecordCommand command);

    void delete(Long recordId);
}
