import React, { useState } from "react";
import axios from "axios";
import "./AddBarOrEvent.css";

const API_BASE_URL = "https://final-project-server-sk27.onrender.com";

const AddBarOrEvent = () => {
  const [type, setType] = useState("bar");
  const [formData, setFormData] = useState({
    name: "",
    location: {
      lat: 0,
      lng: 0,
    },
    instagram: "",
    videoUrl: "",
    imageUrl: "",
    likes: 0,
    discountOne: "",
    discountSec: "",
    discountThi: "",
    type: "",  // זה השם הנכון, לא typeEvent
    description: "",
    date: "",
    price: 0,
    photo: "",
    website: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
  
    if (name === "lat" || name === "lng") {
      setFormData({
        ...formData,
        location: {
          ...formData.location,
          [name]: value, // עדכון השדה המתאים ב- location
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();

    // בדיקה אם השדות החיוניים מלאים
    if (!formData.name || !formData.location.lat || !formData.location.lng) {
      alert("Please fill in all required fields (Name, Latitude, and Longitude).");
      return;
    }

    if (type === "bar" && (!formData.discountOne || !formData.discountSec || !formData.discountThi)) {
      alert("Please fill in all required discount fields for the bar.");
      return;
    }

    if (type === "event" && (!formData.type || !formData.description || !formData.date)) {
      alert("Please fill in all required event fields (Type, Description, and Date).");
      return;
    }

    const endpoint =
      type === "bar"
        ? `${API_BASE_URL}/api/bars`
        : `${API_BASE_URL}/api/events`;

    try {
      // שליחה לשרת
      await axios.post(endpoint, formData);
      alert(`${type === "bar" ? "Bar" : "Event"} added successfully!`);

      // איפוס טופס אחרי שליחה מוצלחת
      setFormData({
        name: "",
        location: {
          lat: 0,
          lng: 0,
        },
        instagram: "",
        videoUrl: "",
        imageUrl: "",
        likes: 0,
        discountOne: "",
        discountSec: "",
        discountThi: "",
        type: "",  // מאפס גם את type
        description: "",
        date: "",
        price: 0,
        photo: "",
        website: "",
      });
    } catch (error) {
      alert("Error adding the data. Please try again.");
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Add {type === "bar" ? "Bar" : "Event"}</h2>
      <div className="tab-container">
        <button
          className={`tab ${type === "bar" ? "active" : ""}`}
          onClick={() => setType("bar")}
        >
          הוסף הנחה
        </button>
        <button
          className={`tab ${type === "event" ? "active" : ""}`}
          onClick={() => setType("event")}
        >
          הוסף ארוע
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        <input
          type="text"
          name="name"
          value={formData.name}
          placeholder="Name"
          onChange={handleInputChange}
          required
        />
        <input
          type="number"
          name="lat"
          value={formData.location.lat}
          placeholder="Latitude"
          onChange={handleInputChange}
          required
        />
        <input
          type="number"
          name="lng"
          value={formData.location.lng}
          placeholder="Longitude"
          onChange={handleInputChange}
          required
        />
        {type === "bar" && (
          <>
            <input
              type="text"
              name="instagram"
              value={formData.instagram}
              placeholder="Instagram URL"
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="videoUrl"
              value={formData.videoUrl}
              placeholder="Video URL"
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="imageUrl"
              value={formData.imageUrl}
              placeholder="Image URL"
              onChange={handleInputChange}
            />
            <input
              type="number"
              name="likes"
              value={formData.likes}
              placeholder="Likes"
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="discountOne"
              value={formData.discountOne}
              placeholder="First Discount"
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="discountSec"
              value={formData.discountSec}
              placeholder="Second Discount"
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="discountThi"
              value={formData.discountThi}
              placeholder="Third Discount"
              onChange={handleInputChange}
            />
          </>
        )}

        {type === "event" && (
          <>
                        <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                >
                <option value=""> סוג הארוע</option>
                <option value="Party">מסיבה</option>
                <option value="Concert">הופעה</option>
                <option value="student">יריד סטודנטים</option>
                <option value="lecture">הרצאה</option>
                <option value="Standup">סטאנד-אפ</option>
                <option value="houseparty">מסיבת דירה</option>
                <option value="sport">ארוע ספורט</option>
                </select>
            <textarea
              name="description"
              value={formData.description}
              placeholder="Description"
              onChange={handleInputChange}
            />
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
            <input
              type="number"
              name="price"
              value={formData.price}
              placeholder="Price"
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="photo"
              value={formData.photo}
              placeholder="Photo URL"
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="website"
              value={formData.website}
              placeholder="Website URL"
              onChange={handleInputChange}
            />
          </>
        )}

        <button type="submit">Add {type === "bar" ? "Bar" : "Event"}</button>
      </form>
    </div>
  );
};

export default AddBarOrEvent;
