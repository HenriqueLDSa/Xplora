import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';

import * as Yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import '../css-files/Login.css';
import logo from '../../images/logo.png'; // Replace with actual path

interface LoginFormValues {
    email: string;
    password: string;
}

const LoginSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email').required('Required'),
    password: Yup.string().required('Required')
});

const app_name = 'xplora.fun'; 

function buildPath(route: string): string {
    if (process.env.NODE_ENV !== 'development') {
        return `https://${app_name}/${route}`;
    } else {
        return `http://localhost:5000/${route}`;
    }
}


const LoginForm: React.FC = () => {

    const navigate = useNavigate();

    return (
        <div className="new-password-page">
            <div className="new-password-main">
                <Link to="/">
                    <img id="new-password-logo" src={logo} />
                </Link>
                <div className="new-password-container">
                    <div className="new-password-form-wrapper">
                        <Formik
                            initialValues={{
                                email: '',
                                password: '',
                            }}
                            validationSchema={LoginSchema}
                            onSubmit={async (values: LoginFormValues, { setSubmitting, setErrors }) => {
                                //debugger
                                console.log("Form submitted");
                                try {
                                    // calls the login api 
                                    const response = await fetch(buildPath('api/login'), {
                                        // get information from database
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify(values),

                                    });

                                    const data = await response.json();

                                    if (response.ok) {
                                        console.log('Login successful:', data);


                                        // Store user data in localStorage
                                        localStorage.setItem('ID', data.id);
                                        console.log(data.id);
                                        localStorage.setItem('firstName', data.firstName);
                                        localStorage.setItem('lastName', data.lastName);
                                        localStorage.setItem('email', data.email);

                                        navigate('/dashboard');
                                        // Handle successful login here
                                    } else {
                                        setErrors({ email: data.error });
                                    }
                                } catch (error) {
                                    console.error('Error:', error);
                                    setErrors({ email: 'An error occurred. Please try again.' });
                                } finally {
                                    setSubmitting(false);
                                }
                            }}>
                            {({ isSubmitting }) => (
                                <Form className="new-password-form">
                                    <h2 className='welcome-back'>Welcome Back!</h2>
                                    <div className="new-password-form-field">
                                        <Field type="email" name="email" placeholder="Email" className="new-password-input-field" />
                                    </div>
                                    <div className="new-password-error-container">
                                        <ErrorMessage name="email" component="div" className="new-password-error-message" />
                                    </div>

                                    <div className="new-password-form-field">
                                        <Field type="password" name="password" placeholder="Password" className="new-password-input-field" />
                                    </div>
                                    <div className="new-password-error-container">
                                        <ErrorMessage name="password" component="div" className="new-password-error-message" />
                                    </div>

                                    <div className="new-password-forgot-password-container">
                                        <Link to="/forgot-password" className="forgot-password-link">Forgot Password?</Link>
                                    </div>

                                    <button type="submit" disabled={isSubmitting} className="new-password-submit-button">
                                        Get Exploring!
                                    </button>
                                </Form>
                            )}
                        </Formik>
                        <p className="signup-link">Don't have an account? <Link to="/sign-up">Sign Up</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;
