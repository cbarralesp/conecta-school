import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import emailjs from '@emailjs/browser';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  contactForm: FormGroup;
  submitted = false;
  successMessage = false;
  errorMessage = false;
  loading = false;

  // REEMPLAZA ESTOS VALORES CON LOS TUYOS
  private readonly SERVICE_ID = 'service_abc123';  // Tu Service ID
  private readonly TEMPLATE_ID = 'template_xyz789'; // Tu Template ID
  private readonly PUBLIC_KEY = 'YOUR_PUBLIC_KEY';  // Tu Public Key

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', Validators.required],
      mensaje: ['', Validators.required]
    });
  }

  get f() {
    return this.contactForm.controls;
  }

  async onSubmit() {
    this.submitted = true;
    this.errorMessage = false;
    this.successMessage = false;

    if (this.contactForm.invalid) {
      return;
    }

    this.loading = true;

    try {
      // Enviar email usando EmailJS
      const response = await emailjs.send(
        this.SERVICE_ID,
        this.TEMPLATE_ID,
        {
          nombre: this.contactForm.value.nombre,
          email: this.contactForm.value.email,
          telefono: this.contactForm.value.telefono,
          mensaje: this.contactForm.value.mensaje,
          to_email: 'cr.barrales@gmail.com' // Email donde recibirás los mensajes
        },
        this.PUBLIC_KEY
      );

      console.log('Email enviado exitosamente!', response);

      this.successMessage = true;
      this.contactForm.reset();
      this.submitted = false;

      // Ocultar mensaje después de 5 segundos
      setTimeout(() => {
        this.successMessage = false;
      }, 5000);

    } catch (error) {
      console.error('Error al enviar email:', error);
      this.errorMessage = true;

      setTimeout(() => {
        this.errorMessage = false;
      }, 5000);
    } finally {
      this.loading = false;
    }
  }
}
